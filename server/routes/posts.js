// routes/posts.js
import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { supabaseAdmin } from "../config/supabase.js"; // admin client

const router = express.Router();

export default function postsRoute(supabase, upload, uploadDir) {
  // Upload media to Supabase Storage (private bucket)
  async function uploadToStorage(file, bucket = "images") {
    const filename = `${Date.now()}-${file.originalname}`;
    const fileStream = fs.createReadStream(file.path);

    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filename, fileStream, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      // Cleanup temp file
      fs.unlink(file.path, () => {});

      // Return path, NOT public URL
      return `${bucket}/${filename}`;
    } catch (err) {
      fs.existsSync(file.path) && fs.unlinkSync(file.path);
      throw err;
    }
  }

  // POST /post
  router.post("/post", upload.single("media"), async (req, res) => {
    const { user_id, caption } = req.body;
    if (!req.file) return res.status(400).json({ error: "No media uploaded" });

    const fileType = req.file.mimetype?.split?.("/")[0] || "image";
    const inputPath = req.file.path;

    try {
      // Video processing
      if (fileType === "video") {
        const outputFilename = `${Date.now()}.mp4`;
        const outputPath = path.join(uploadDir, outputFilename);

        ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .on("end", async () => {
            fs.existsSync(inputPath) && fs.unlinkSync(inputPath);

            try {
              const mediaPath = await uploadToStorage(
                { ...req.file, path: outputPath, originalname: outputFilename },
                "videos"
              );

              fs.existsSync(outputPath) && fs.unlinkSync(outputPath);

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
                  users (id, fname, lname, profile_picture_url)
                `
                )
                .single();

              if (error) throw error;
              return res.status(200).json(data);
            } catch (err) {
              console.error("Video upload error:", err);
              return res
                .status(500)
                .json({ error: err.message || "Upload failed" });
            }
          })
          .on("error", (err) => {
            console.error("ffmpeg error:", err);
            fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
            return res.status(500).json({ error: "Video processing failed" });
          })
          .run();

        return;
      }

      // Handle images or other non-video files
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
          users (id, fname, lname, profile_picture_url)
        `
        )
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // GET /posts with signed URLs
  router.get("/posts", async (req, res) => {
    try {
      const { page = 1, limit = 10, user_id } = req.query;
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      let query = supabase
        .from("posts")
        .select(
          `
          *,
          users (id, fname, lname, profile_picture_url)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(start, end);

      if (user_id) query = query.eq("user_id", user_id);

      const { data, error, count } = await query;
      if (error) throw error;

      const posts = Array.isArray(data) ? data : [];

      // generate signed URLs
      const postsWithSignedUrls = await Promise.all(
        posts.map(async (post) => {
          if (!post.media_url) return post;

          const bucket = post.type === "video" ? "videos" : "images";
          const pathInBucket = post.media_url.replace(`${bucket}/`, "");

          try {
            const { data: signedData, error: signedError } =
              await supabaseAdmin.storage
                .from(bucket)
                .createSignedUrl(pathInBucket, 60 * 60); // 1 hour

            if (signedError) {
              console.warn(
                "Signed URL error for",
                pathInBucket,
                signedError.message
              );
              return { ...post, media_signed_url: null };
            }

            if (!signedData || !signedData.signedUrl) {
              console.warn("Signed URL missing data for", pathInBucket);
              return { ...post, media_signed_url: null };
            }

            return { ...post, media_signed_url: signedData.signedUrl };
          } catch (e) {
            console.error("Signed URL generation failed", e);
            return { ...post, media_signed_url: null };
          }
        })
      );

      return res.json({
        posts: postsWithSignedUrls,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        currentPage: Number(page),
      });
    } catch (err) {
      console.error("GET /posts error:", err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // DELETE post
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
        const pathInBucket = post.media_url.replace(`${bucket}/`, "");
        await supabaseAdmin.storage.from(bucket).remove([pathInBucket]);
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
