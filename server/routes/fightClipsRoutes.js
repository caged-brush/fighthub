import express from "express";
import crypto from "crypto";
const router = express.Router();

export default function fightClipsRoutes(supabase, requireAuth) {
  // 1) Create signed upload URL
  // routes/fightClipsRoutes.js
  router.post("/sign-upload", requireAuth, async (req, res) => {
    const userId = String(req.user.id);
    const { fileExt, mimeType } = req.body;

    if (!fileExt || !mimeType) {
      return res.status(400).json({ message: "fileExt and mimeType required" });
    }

    const clipId = crypto.randomUUID();
    const safeExt = String(fileExt).replace(".", "").toLowerCase();
    const storagePath = `${userId}/${clipId}.${safeExt}`;

    try {
      const { data, error } = await supabase.storage
        .from("fight_clips")
        .createSignedUploadUrl(storagePath);

      if (error) throw error;

      // IMPORTANT: return token
      return res.json({
        clipId,
        storagePath,
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
      });
    } catch (err) {
      console.error("sign-upload error:", err);
      return res.status(500).json({ message: "Failed to sign upload" });
    }
  });

  // 2) Save metadata AFTER upload succeeds
  router.post("/create", requireAuth, async (req, res) => {
    console.log("🔥 /fight-clips/create hit", req.user?.id);
    console.log("📦 body:", req.body);

    const userId = String(req.user.id);

    const {
      fight_date,
      opponent,
      promotion,
      result,
      weight_class,
      notes,
      storage_path,
      mime_type,
      file_size,
    } = req.body;

    if (!storage_path) {
      return res.status(400).json({ message: "storage_path required" });
    }

    try {
      const { data, error } = await supabase
        .from("fight_clips")
        .insert([
          {
            user_id: userId,
            fight_date,
            opponent,
            promotion,
            result,
            weight_class,
            notes,
            storage_path,
            mime_type,
            file_size,
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      return res.json({ clip: data });
    } catch (err) {
      console.error("create clip error:", err);
      return res.status(500).json({ error: err });
    }
  });

  // 3) List my clips
  router.get("/me", requireAuth, async (req, res) => {
    const userId = String(req.user.id);

    try {
      const { data, error } = await supabase
        .from("fight_clips")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.json({ clips: data || [] });
    } catch (err) {
      console.error("list clips error:", err?.message || err);
      return res.status(500).json({ message: "Failed to load clips" });
    }
  });

  // 4) Get signed playback URL for a clip (private bucket)
  router.get("/:clipId/play", requireAuth, async (req, res) => {
    const userId = String(req.user.id);
    const { clipId } = req.params;

    try {
      const { data: clip, error: clipErr } = await supabase
        .from("fight_clips")
        .select("id, user_id, storage_path")
        .eq("id", clipId)
        .single();

      if (clipErr) throw clipErr;

      // Only owner for MVP (later: allow connected scouts)
      if (String(clip.user_id) !== userId) {
        return res.status(403).json({ message: "Not allowed" });
      }

      const { data, error } = await supabase.storage
        .from("fight_clips")
        .createSignedUrl(clip.storage_path, 60 * 10); // 10 min

      if (error) throw error;

      return res.json({ url: data.signedUrl });
    } catch (err) {
      console.error("play url error:", err?.message || err);
      return res.status(500).json({ message: "Failed to create play url" });
    }
  });

  return router;
}
