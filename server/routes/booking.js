import express from "express";
import requireSupabaseAuth from "../middleware/requireSupabaseAuth.js";
import { supabaseAsUser } from "../config/supabaseUser.js";

const router = express.Router();

router.post("/requests/send", requireSupabaseAuth, async (req, res) => {
  const {
    fight_slot_id,
    fighter_id,
    note = null,
    expires_in_hours = 24,
  } = req.body || {};
  if (!fight_slot_id || !fighter_id) {
    return res
      .status(400)
      .json({ message: "fight_slot_id and fighter_id are required" });
  }

  const supabase = supabaseAsUser(req.accessToken);

  const { data, error } = await supabase.rpc("send_fight_request", {
    p_fight_slot_id: fight_slot_id,
    p_fighter_id: fighter_id,
    p_note: note,
    p_expires_in: `${expires_in_hours} hours`,
  });

  if (error)
    return res.status(400).json({ message: error.message, code: error.code });
  return res.json({ request_id: data });
});

router.post("/slots/apply", requireSupabaseAuth, async (req, res) => {
  const {
    fight_slot_id,
    note = null,
    highlight_video_url = null,
  } = req.body || {};
  if (!fight_slot_id)
    return res.status(400).json({ message: "fight_slot_id is required" });

  const supabase = supabaseAsUser(req.accessToken);

  const { data, error } = await supabase.rpc("apply_to_fight_slot", {
    p_fight_slot_id: fight_slot_id,
    p_note: note,
    p_highlight_video_url: highlight_video_url,
  });

  if (error)
    return res.status(400).json({ message: error.message, code: error.code });
  return res.json({ request_id: data });
});

router.post("/requests/:id/accept", requireSupabaseAuth, async (req, res) => {
  const requestId = req.params.id;
  const supabase = supabaseAsUser(req.accessToken);

  const { data, error } = await supabase.rpc("accept_fight_request", {
    p_request_id: requestId,
  });

  if (error)
    return res.status(400).json({ message: error.message, code: error.code });
  return res.json({ commitment_id: data });
});

export default router;
