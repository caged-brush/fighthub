import express from "express";
import crypto from "crypto";
const router = express.Router();

function extractYouTubeId(url) {
  if (!url) return null;
  const s = String(url).trim();

  // youtu.be/VIDEO_ID
  let m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // youtube.com/watch?v=VIDEO_ID
  m = s.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // youtube.com/shorts/VIDEO_ID
  m = s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // youtube.com/embed/VIDEO_ID
  m = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  return null;
}

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
      fight_date = null,
      opponent = null,
      promotion = null,
      result = "win",
      weight_class = null,
      notes = null,
      storage_path,
      mime_type,
      file_size,
      visibility = "public",
    } = req.body;

    if (!storage_path) {
      return res.status(400).json({ message: "storage_path required" });
    }

    if (!mime_type) {
      return res.status(400).json({ message: "mime_type required" });
    }

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
            source_type: "upload", // ✅ important
            fight_date,
            opponent,
            promotion,
            result,
            weight_class,
            notes,
            storage_path,
            mime_type,
            file_size,
            visibility,
            youtube_url: null,
            youtube_id: null,
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
        [
          "id",
          "fight_date",
          "opponent",
          "promotion",
          "result",
          "weight_class",
          "notes",
          "storage_path",
          "mime_type",
          "file_size",
          "created_at",
          "visibility",
          // ✅ NEW
          "source_type",
          "youtube_id",
          "youtube_url",
        ].join(","),
      )
      .eq("user_id", userId)
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load clips:", error);
      return res.status(500).json({ message: "Failed to load clips" });
    }

    const expiresIn = 60 * 10;

    const clipsWithUrls = await Promise.all(
      (clips || []).map(async (clip) => {
        // ✅ Treat null source_type as upload (backward compatible)
        const sourceType = clip.source_type || "upload";

        // YouTube clips: no storage signing
        if (sourceType === "youtube") {
          return { ...clip, signed_url: null };
        }

        // Upload clips: sign only if storage_path exists
        if (!clip.storage_path) {
          return { ...clip, signed_url: null };
        }

        const { data, error: signErr } = await supabaseAdmin.storage
          .from("fight_clips")
          .createSignedUrl(clip.storage_path, expiresIn);

        return {
          ...clip,
          signed_url: signErr ? null : data?.signedUrl || null,
        };
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
        .select("id, user_id, storage_path, visibility, source_type")
        .eq("id", clipId)
        .single();

      if (clipErr || !clip) {
        return res.status(404).json({ message: "Clip not found" });
      }

      const sourceType = clip.source_type || "upload";

      // ✅ YouTube clips do not have play URLs
      if (sourceType === "youtube") {
        return res.status(400).json({ message: "This clip is a YouTube link" });
      }

      if (!clip.storage_path) {
        return res
          .status(400)
          .json({ message: "Missing storage_path for upload clip" });
      }

      const isOwner = String(clip.user_id) === userId;

      if (!isOwner && clip.visibility !== "public") {
        return res.status(403).json({ message: "Not allowed" });
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

  // 5) Get clips from youtube
  router.post("/create-youtube", requireAuth, async (req, res) => {
    const userId = String(req.user.id);

    const {
      fight_date = null,
      opponent = null,
      promotion = null,
      result = "win",
      weight_class = null,
      notes = null,
      youtube_url,
      visibility = "public",
    } = req.body;

    if (!youtube_url) {
      return res.status(400).json({ message: "youtube_url required" });
    }

    const youtube_id = extractYouTubeId(youtube_url);
    if (!youtube_id) {
      return res.status(400).json({ message: "Invalid YouTube URL" });
    }

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
            source_type: "youtube",
            youtube_url,
            youtube_id,
            fight_date,
            opponent,
            promotion,
            result,
            weight_class,
            notes,
            visibility,
            storage_path: null,
            mime_type: "text/youtube",
            file_size: null,
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      return res.json({ clip: data });
    } catch (err) {
      console.error("create-youtube error:", err?.message || err);
      return res.status(500).json({ message: "Failed to create YouTube clip" });
    }
  });

  router.get("/feed", requireAuth, async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({
        message: "Server misconfig: SUPABASE_SERVICE_ROLE_KEY missing",
      });
    }

    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const cursor = req.query.cursor || null; // created_at ISO

    try {
      let query = supabaseAdmin
        .from("fight_clips")
        .select(
          `
        id,
        user_id,
        fight_date,
        opponent,
        promotion,
        result,
        weight_class,
        notes,
        storage_path,
        mime_type,
        file_size,
        created_at,
        visibility,
        source_type,
        youtube_url,
        youtube_id,
        users (
          id,
          fname,
          lname,
          profile_picture_url,
          role
        )
      `,
        )
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data: clips, error } = await query;
      if (error) throw error;

      const nextCursor =
        clips && clips.length ? clips[clips.length - 1].created_at : null;

      return res.json({
        clips: clips || [],
        nextCursor,
      });
    } catch (err) {
      console.error("fight_clips feed error:", err?.message || err);
      return res.status(500).json({ message: "Failed to load feed" });
    }
  });

  return router;
}
