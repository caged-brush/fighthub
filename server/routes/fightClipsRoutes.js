import express from "express";
import crypto from "crypto";
const router = express.Router();

export default function fightClipsRoutes(supabase, supabaseAdmin, requireAuth) {
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

    // ✅ MUST exist or you misconfigured env on Render
    if (!supabaseAdmin) {
      return res.status(500).json({
        message: "Server misconfig: SUPABASE_SERVICE_ROLE_KEY missing",
      });
    }

    try {
      const { data, error } = await supabaseAdmin
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
      console.error("create clip error:", err?.message || err);
      return res.status(500).json({ message: "Failed to save clip" });
    }
  });

  router.get("/user/:userId", requireAuth, async (req, res) => {
    const { userId } = req.params;

    if (!supabaseAdmin) {
      return res
        .status(500)
        .json({ message: "Server misconfig: service role missing" });
    }

    const { data: clips, error } = await supabaseAdmin
      .from("fight_clips")
      .select(
        "id,fight_date,opponent,promotion,result,weight_class,notes,storage_path,mime_type,file_size,created_at,visibility",
      )
      .eq("user_id", userId)
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: "Failed to load clips" });

    const expiresIn = 60 * 10;
    const clipsWithUrls = await Promise.all(
      (clips || []).map(async (clip) => {
        const { data, error } = await supabaseAdmin.storage
          .from("fight_clips")
          .createSignedUrl(clip.storage_path, expiresIn);

        return { ...clip, signed_url: error ? null : data.signedUrl };
      }),
    );

    return res.json({ clips: clipsWithUrls });
  });

  // 3) List my clips
  router.get("/me", requireAuth, async (req, res) => {
    const userId = String(req.user.id);

    if (!supabaseAdmin) {
      return res.status(500).json({
        message: "Server misconfig: SUPABASE_SERVICE_ROLE_KEY missing",
      });
    }
    try {
      const { data: clips, error } = await supabaseAdmin
        .from("fight_clips")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // sign URLs (10 minutes)
      const expiresIn = 60 * 10;

      const clipsWithUrls = await Promise.all(
        (clips || []).map(async (clip) => {
          if (!clip.storage_path || !supabaseAdmin)
            return { ...clip, signed_url: null };

          const { data, error } = await supabaseAdmin.storage
            .from("fight_clips")
            .createSignedUrl(clip.storage_path, expiresIn);

          return {
            ...clip,
            signed_url: error ? null : data.signedUrl,
          };
        }),
      );

      return res.json({ clips: clipsWithUrls });
    } catch (err) {
      console.error("list clips error:", err?.message || err);
      return res.status(500).json({ message: "Failed to load clips" });
    }
  });

  // 4) Get signed playback URL for a clip (private bucket)
  router.get("/:clipId/play", requireAuth, async (req, res) => {
    const userId = String(req.user.id);
    const { clipId } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({
        message: "Server misconfig: SUPABASE_SERVICE_ROLE_KEY missing",
      });
    }

    try {
      const { data: clip, error: clipErr } = await supabaseAdmin
        .from("fight_clips")
        .select("id, user_id, storage_path, visibility")
        .eq("id", clipId)
        .single();

      if (clipErr || !clip)
        return res.status(404).json({ message: "Clip not found" });

      const isOwner = String(clip.user_id) === userId;

      // Owner can always watch
      if (!isOwner) {
        // Non-owner (scout, etc.) can only watch public clips
        if (clip.visibility !== "public") {
          return res.status(403).json({ message: "Not allowed" });
        }
      }

      const { data, error } = await supabaseAdmin.storage
        .from("fight_clips")
        .createSignedUrl(clip.storage_path, 60 * 10);

      if (error) throw error;

      return res.json({ url: data.signedUrl });
    } catch (err) {
      console.error("play url error:", err?.message || err);
      return res.status(500).json({ message: "Failed to create play url" });
    }
  });

  return router;
}
