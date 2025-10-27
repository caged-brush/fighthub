// routes/posts.js
import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { supabaseAdmin } from "../config/supabase.js"; // <- named import (service role client)

const router = express.Router();

export default function postsRoute(supabase, upload, uploadDir) {
  // Upload media to Supabase Storage (uses admin client to write to private buckets)
  async function uploadToStorage(file, bucket = "images") {
    const filename = `${Date.now()}-${file.originalname}`;
    const fileStream = fs.createReadStream(file.path);

    try {
      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filename, fileStream, {
          contentType: file.mimetype,
          upsert: false,
          duplex: "half",
        });

      if (error) throw error;

      // Cleanup temp file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.warn("cleanup failed:", e?.message || e);
      }

      // Generate a **public URL** for the uploaded file
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(filename);

      return publicUrlData.publicUrl; // ✅ Return the full URL, not a relative path
    } catch (err) {
      // Cleanup on error
      try {
        if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (e) {
        /* ignore */
      }
      throw err;
    }
  }

  // POST /post
  router.post("/post", upload.single("media"), async (req, res) => {
    const { user_id, caption } = req.body;
    if (!req.file) return res.status(400).json({ error: "No media uploaded" });

    const fileType = req.file.mimetype?.split?.("/")?.[0] || "image";
    const inputPath = req.file.path;

    try {
      // Handle video conversion
      if (fileType === "video") {
        const outputFilename = `${Date.now()}.mp4`;
        const outputPath = path.join(uploadDir, outputFilename);

        ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .on("end", async () => {
            // remove original uploaded file
            try {
              if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            } catch (e) {}

            try {
              // upload converted video to storage (admin client)
              const mediaPath = await uploadToStorage(
                { ...req.file, path: outputPath, originalname: outputFilename },
                "videos"
              );

              // delete converted file
              try {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
              } catch (e) {}

              // insert post using admin client to bypass RLS
              const { data, error } = await supabaseAdmin
                .from("posts")
                .insert({
                  user_id,
                  media_url: mediaPath,
                  caption,
                  type: fileType,
                  created_at: new Date().toISOString(),
                })
                .select(
                  `
                  *,
                  users (
                    id,
                    fname,
                    lname,
                    profile_picture_url
                  )
                `
                )
                .single();

              if (error) throw error;
              return res.status(200).json(data);
            } catch (err) {
              console.error("video upload/insert error:", err);
              return res
                .status(500)
                .json({ error: err.message || "Upload failed" });
            }
          })
          .on("error", (err) => {
            console.error("ffmpeg error:", err);
            try {
              if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            } catch (e) {}
            return res.status(500).json({ error: "Video processing failed" });
          })
          .run();

        // we return inside ffmpeg callbacks, so stop here
        return;
      }

      // Handle images (and other non-video files)
      const mediaPath = await uploadToStorage(req.file, "images");

      const { data, error } = await supabaseAdmin
        .from("posts")
        .insert({
          user_id,
          media_url: mediaPath,
          caption,
          type: fileType,
          created_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          users (
            id,
            fname,
            lname,
            profile_picture_url
          )
        `
        )
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      console.error("POST /post error:", err);
      // ensure any temp file is removed
      try {
        if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      } catch (e) {}
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // GET /posts with signed urls for private buckets
  router.get("/posts", async (req, res) => {
    try {
      const { page = 1, limit = 10, user_id } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum - 1;

      let query = supabase
        .from("posts")
        .select(
          `
          *,
          users (
            id,
            fname,
            lname,
            profile_picture_url
          )
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(start, end);

      if (user_id) query = query.eq("user_id", user_id);

      const { data, error, count } = await query;
      if (error) throw error;

      const posts = Array.isArray(data) ? data : [];

      // Generate signed URLs using admin client
      const postsWithSignedUrls = await Promise.all(
        posts.map(async (post) => {
          if (!post.media_url) return post;

          // ✅ Skip signing if media_url is already a public Supabase URL
          if (post.media_url.startsWith("https://")) {
            return { ...post, media_signed_url: post.media_url };
          }

          try {
            const bucket = post.type === "video" ? "videos" : "images";
            const pathInBucket = post.media_url.startsWith(`${bucket}/`)
              ? post.media_url.replace(`${bucket}/`, "")
              : post.media_url;

            const { data: signedData, error: signedError } =
              await supabaseAdmin.storage
                .from(bucket)
                .createSignedUrl(pathInBucket, 60 * 60); // 1 hour

            if (signedError) {
              console.warn("signed url error:", signedError);
              return post;
            }

            return { ...post, media_signed_url: signedData.signedUrl };
          } catch (e) {
            console.error("signed url generation failed:", e);
            return post;
          }
        })
      );

      return res.json({
        posts: postsWithSignedUrls,
        total: count || 0,
        pages: Math.ceil((count || 0) / limitNum),
        currentPage: pageNum,
      });
    } catch (err) {
      console.error("GET /posts error:", err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // GET /posts/user/:user_id - fetch all posts by a specific user
  router.get("/posts/user/:user_id", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("posts")
        .select(
          `
        *,
        users (
          id,
          fname,
          lname,
          profile_picture_url
        )
        `
        )
        .eq("user_id", req.params.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      console.error("GET /posts/user/:user_id error:", err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // GET single post (use admin client to bypass RLS if needed)
  router.get("/posts/:id", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("posts")
        .select(
          `
    *,
    users (
      id,
      fname,
      lname,
      profile_picture_url
    ),
    likes (
      user_id
    )
    `
        )
        .eq("id", req.params.id)
        .maybeSingle(); // prevents crash if post not found

      if (error) throw error;

      if (!data) {
        return res.status(404).json({ error: "Post not found" });
      }

      // generate signed url for this post if private
      if (data?.media_url) {
        const bucket = data.type === "video" ? "videos" : "images";
        const pathInBucket = data.media_url.startsWith(`${bucket}/`)
          ? data.media_url.replace(`${bucket}/`, "")
          : data.media_url;

        try {
          const { data: signedData } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(pathInBucket, 60 * 60);
          data.media_signed_url = signedData?.signedUrl || null;
        } catch (e) {
          console.warn("signed url generation single post failed", e);
        }
      }

      return res.json(data);
    } catch (err) {
      console.error("GET /posts/:id error:", err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // DELETE post (remove from storage and DB) — use admin client for both ops
  router.delete("/posts/:id", async (req, res) => {
    try {
      const { data: post, error: fetchError } = await supabaseAdmin
        .from("posts")
        .select("media_url, type")
        .eq("id", req.params.id)
        .single();

      if (fetchError) throw fetchError;

      if (post?.media_url) {
        const bucket = post.type === "video" ? "videos" : "images";
        const pathInBucket = post.media_url.startsWith(`${bucket}/`)
          ? post.media_url.replace(`${bucket}/`, "")
          : post.media_url;

        // delete from storage
        const { error: rmError } = await supabaseAdmin.storage
          .from(bucket)
          .remove([pathInBucket]);
        if (rmError) console.warn("storage remove error:", rmError);
      }

      const { error: delError } = await supabaseAdmin
        .from("posts")
        .delete()
        .eq("id", req.params.id);

      if (delError) throw delError;

      return res.json({ message: "Post deleted successfully" });
    } catch (err) {
      console.error("DELETE /posts/:id error:", err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  return router;
}
