import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const router = express.Router();

export default function postsRoute(db, upload, uploadDir) {
  // Media upload
  router.post("/post", upload.single("media"), async (req, res) => {
    const { user_id, caption } = req.body;
    if (!req.file) return res.status(400).json({ error: "No media uploaded" });

    const fileType = req.file.mimetype.split("/")[0];
    const inputPath = req.file.path;

    if (fileType === "video") {
      const outputFilename = `${Date.now()}.mp4`;
      const outputPath = path.join(uploadDir, outputFilename);

      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .on("end", async () => {
          fs.unlinkSync(inputPath);
          try {
            const result = await db.query(
              "INSERT INTO posts (user_id, media_url, caption) VALUES ($1, $2, $3) RETURNING *",
              [user_id, `/uploads/${outputFilename}`, caption]
            );
            res.status(200).json(result.rows[0]);
          } catch (error) {
            res.status(500).json({ error: "Database error" });
          }
        })
        .on("error", (error) => {
          res.status(500).json({ error: "Video processing failed" });
        })
        .run();
    } else if (fileType === "image") {
      try {
        const result = await db.query(
          "INSERT INTO posts (user_id, media_url, caption) VALUES ($1, $2, $3) RETURNING *",
          [user_id, `/uploads/${req.file.filename}`, caption]
        );
        res.status(200).json(result.rows[0]);
      } catch (error) {
        res.status(500).json({ error: "Database error" });
      }
    } else {
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: "Unsupported media type" });
    }
  });

  // Paginated posts
  router.get("/posts", async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    try {
      const result = await db.query(
        "SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      );
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Error fetching posts" });
    }
  });

  // User posts
  router.get("/posts/:userId", async (req, res) => {
    const userId = req.params.userId;
    try {
      const result = await db.query("SELECT * FROM posts WHERE user_id = $1", [
        userId,
      ]);
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
