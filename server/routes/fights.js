import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { supabaseAsUser } from "../config/supabaseUser.js";
import { supabaseAdmin } from "../config/supabase.js";


const router = express.Router();

/**
 * POST /api/fights/applications/:id/accept
 * Scout/promoter accepts a fighter application for a slot.
 *
 * Atomic via Supabase RPC: accept_fight_application(p_application_id uuid)
 */
router.post("/applications/:id/accept", requireAuth, async (req, res) => {
  const applicationId = req.params.id;

  // requireAuth should set req.user + req.accessToken (best)
  const token =
    req.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) return res.status(401).json({ message: "Missing token" });

  const supabase = supabaseAsUser(token);

  const { data, error } = await supabase.rpc("accept_fight_application", {
    p_application_id: applicationId,
  });

  if (error) {
    const msg = error.message || "Failed to accept application";
    const status = msg.includes("Not authorized")
      ? 403
      : msg.includes("Not authenticated")
        ? 401
        : msg.includes("already has a commitment")
          ? 409
          : msg.includes("not found")
            ? 404
            : msg.includes("not in an acceptable state")
              ? 409
              : 400;

    return res.status(status).json({ message: msg });
  }

  const row = Array.isArray(data) ? data[0] : data;

  return res.json({
    ok: true,
    commitment_id: row?.commitment_id,
    fight_slot_id: row?.fight_slot_id,
    fighter_id: row?.fighter_id,
  });
});

router.post("/opportunities", requireAuth, async (req, res) => {
  try {
    // Only scouts can create opportunities
    if (req.user?.role !== "scout") {
      return res
        .status(403)
        .json({ message: "Only scouts can create fight opportunities." });
    }

    const { event, slot } = req.body || {};
    if (!event || !slot) {
      return res
        .status(400)
        .json({ message: "Missing event or slot payload." });
    }

    // Minimal validation (do more later, but don't block shipping)
    const requiredEventFields = [
      "promotion_name",
      "title",
      "discipline",
      "region",
      "city",
      "venue",
      "event_date",
    ];
    for (const f of requiredEventFields) {
      if (!String(event?.[f] ?? "").trim()) {
        return res.status(400).json({ message: `Missing event.${f}` });
      }
    }

    const requiredSlotFields = [
      "discipline",
      "weight_class",
      "target_weight_lbs",
      "weight_tolerance_lbs",
      "min_experience",
      "allow_applications",
      "application_deadline",
    ];
    for (const f of requiredSlotFields) {
      if (
        slot?.[f] === undefined ||
        slot?.[f] === null ||
        String(slot?.[f]).trim() === ""
      ) {
        return res.status(400).json({ message: `Missing slot.${f}` });
      }
    }

    // Call RPC to do this atomically in Postgres
    const { data, error } = await supabaseAdmin.rpc(
      "create_fight_opportunity",
      {
        p_creator_id: req.supabaseUser.id,
        p_event: event,
        p_slot: slot,
      },
    );

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const row = Array.isArray(data) ? data[0] : data;

    return res.json({
      ok: true,
      event: { id: row.event_id },
      slot: { id: row.slot_id },
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
});

export default router;
