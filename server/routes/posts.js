// routes/posts.js
import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { supabaseAdmin } from "../config/supabase.js"; // admin client

const router = express.Router();

export default function postsRoute(supabase, upload, uploadDir) {
  const BUCKETS = {
    images: { name: "images", public: false },
    videos: { name: "videos", public: false },
  };

  // Upload file to Supabase Storage
  async function uploadToStorage(file, bucketKey = "images") {
    const bucket = BUCKETS[bucketKey];
    const filename = `${Date.now()}-${file.originalname}`;
    const fileStream = fs.createReadStream(file.path);

    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket.name)
        .upload(filename, fileStream, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      // Delete local file
      fs.existsSync(file.path) && fs.unlinkSync(file.path);

      if (bucket.public) {
        const { data: publicData } = supabaseAdmin.storage
          .from(bucket.name)
          .getPublicUrl(filename);
        return publicData.publicUrl;
      }

      return `${bucket.name}/${filename}`;
    } catch (err) {
      fs.existsSync(file.path) && fs.unlinkSync(file.path);
      console.error("Supabase upload failed:", err.message || err);
      throw new Error("Supabase upload failed");
    }
  }

  // POST /post
  router.post("/post", upload.single("media"), async (req, res) => {
    const { user_id, caption } = req.body;
    if (!req.file) return res.status(400).json({ error: "No media uploaded" });

    const fileType = req.file.mimetype?.split("/")[0] || "image";
    const inputPath = req.file.path;

    try {
      // Video handling
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

      // Handle images & other files
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

  // GET /posts
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

      // Generate URLs
      const postsWithUrls = await Promise.all(
        posts.map(async (post) => {
          if (!post.media_url) return post;

          const bucket =
            post.type === "video" ? BUCKETS.videos : BUCKETS.images;
          let pathInBucket = post.media_url;

          if (!bucket.public) {
            if (pathInBucket.startsWith(`${bucket.name}/`))
              pathInBucket = pathInBucket.slice(bucket.name.length + 1);

            try {
              const { data: signedData, error: signedError } =
                await supabaseAdmin.storage
                  .from(bucket.name)
                  .createSignedUrl(pathInBucket, 60 * 60);

              if (signedError || !signedData?.signedUrl)
                return {
                  ...post,
                  media_signed_url: null,
                };

              return { ...post, media_signed_url: signedData.signedUrl };
            } catch (e) {
              console.error("Signed URL generation failed", e);
              return { ...post, media_signed_url: null };
            }
          } else {
            // public bucket
            return { ...post, media_signed_url: post.media_url };
          }
        })
      );

      return res.json({
        posts: postsWithUrls,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        currentPage: Number(page),
      });
    } catch (err) {
      console.error("GET /posts error:", err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // DELETE /posts/:id
  router.delete("/posts/:id", async (req, res) => {
    try {
      const { data: post, error: fetchError } = await supabaseAdmin
        .from("posts")
        .select("media_url, type")
        .eq("id", req.params.id)
        .single();

      if (fetchError) throw fetchError;

      if (post?.media_url) {
        const bucket = post.type === "video" ? BUCKETS.videos : BUCKETS.images;
        let pathInBucket = post.media_url;

        if (pathInBucket.startsWith(`${bucket.name}/`))
          pathInBucket = pathInBucket.slice(bucket.name.length + 1);

        await supabaseAdmin.storage.from(bucket.name).remove([pathInBucket]);
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
