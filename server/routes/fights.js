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

router.get("/slots/:id", requireAuth, async (req, res) => {
  const slotId = req.params.id;
  const viewerId = req.supabaseUser?.id;

  try {
    // 1) slot
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from("fight_slots")
      .select(
        `
        id,
        event_id,
        discipline,
        weight_class,
        target_weight_lbs,
        weight_tolerance_lbs,
        min_experience,
        style_preferences,
        allow_applications,
        application_deadline,
        travel_support,
        purse_cents,
        status,
        created_at,
        updated_at
      `,
      )
      .eq("id", slotId)
      .maybeSingle();

    if (slotErr) return res.status(500).json({ message: slotErr.message });
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    // 2) event
    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .select(
        `
        id,
        created_by,
        promotion_name,
        title,
        discipline,
        region,
        city,
        venue,
        event_date,
        description,
        rules,
        status,
        created_at,
        updated_at
      `,
      )
      .eq("id", slot.event_id)
      .maybeSingle();

    if (eventErr) return res.status(500).json({ message: eventErr.message });
    if (!event) return res.status(404).json({ message: "Event not found" });

    // auth: owner scout can view anything, others only open slots
    const isOwnerScout =
      req.user?.role === "scout" && event.created_by === viewerId;
    const isPublic = slot.status === "open";
    if (!isOwnerScout && !isPublic) {
      return res
        .status(403)
        .json({ message: "Not allowed to view this slot." });
    }

    // 3) applicants_count
    const { count, error: countErr } = await supabaseAdmin
      .from("fight_applications")
      .select("id", { count: "exact", head: true })
      .eq("fight_slot_id", slotId);

    if (countErr) return res.status(500).json({ message: countErr.message });

    // 4) viewer_application_status (fighters only)
    let viewerStatus = null;
    if (req.user?.role === "fighter") {
      const { data: appRow, error: appErr } = await supabaseAdmin
        .from("fight_applications")
        .select("status")
        .eq("fight_slot_id", slotId)
        .eq("fighter_id", viewerId)
        .maybeSingle();

      if (appErr) return res.status(500).json({ message: appErr.message });
      viewerStatus = appRow?.status || null;
    }

    return res.json({
      slot,
      event,
      meta: {
        applicants_count: count ?? 0,
        viewer_application_status: viewerStatus,
      },
    });
  } catch (e) {
    console.error("[GET /fights/slots/:id] crash:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

router.post("/slots/:id/apply", requireAuth, async (req, res) => {
  const slotId = req.params.id;
  const fighterId = req.supabaseUser?.id;

  try {
    if (req.user?.role !== "fighter") {
      return res.status(403).json({ message: "Only fighters can apply." });
    }

    // Fetch slot rules
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from("fight_slots")
      .select("id, status, allow_applications, application_deadline")
      .eq("id", slotId)
      .maybeSingle();

    if (slotErr) return res.status(500).json({ message: slotErr.message });
    if (!slot) return res.status(404).json({ message: "Slot not found." });

    if (slot.status !== "open") {
      return res.status(409).json({ message: "This slot is not open." });
    }

    if (!slot.allow_applications) {
      return res
        .status(409)
        .json({ message: "Applications are closed for this slot." });
    }

    if (slot.application_deadline) {
      const deadline = new Date(slot.application_deadline).getTime();
      if (Number.isFinite(deadline) && Date.now() > deadline) {
        return res
          .status(409)
          .json({ message: "Application deadline has passed." });
      }
    }

    // Prevent duplicate apply
    const { data: existing } = await supabaseAdmin
      .from("fight_applications")
      .select("id, status")
      .eq("fight_slot_id", slotId)
      .eq("fighter_id", fighterId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        message: "You already applied to this slot.",
        application: existing,
      });
    }

    // Create application
    const { data: created, error: createErr } = await supabaseAdmin
      .from("fight_applications")
      .insert({
        fight_slot_id: slotId,
        fighter_id: fighterId,
        status: "submitted", // ✅ matches your enum
      })
      .select("id, fight_slot_id, fighter_id, status, created_at")
      .single();

    if (createErr) {
      // if you also created a unique constraint, this catches race duplicates
      const msg = createErr.message || "Failed to apply.";
      const isDup =
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("unique");
      return res.status(isDup ? 409 : 400).json({ message: msg });
    }

    return res.json({ ok: true, application: created });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

router.get("/open-slots", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const cursor = req.query.cursor || null; // ISO timestamp of created_at (or application_deadline)

    let q = supabaseAdmin
      .from("fight_slots")
      .select(
        `
        id,
        event_id,
        discipline,
        weight_class,
        target_weight_lbs,
        weight_tolerance_lbs,
        min_experience,
        style_preferences,
        allow_applications,
        application_deadline,
        travel_support,
        purse_cents,
        status,
        created_at,
        events:events (
          id,
          promotion_name,
          title,
          region,
          city,
          venue,
          event_date,
          discipline,
          created_by
        )
      `,
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) q = q.lt("created_at", cursor);

    const { data, error } = await q;
    if (error) return res.status(500).json({ message: error.message });

    const nextCursor =
      data && data.length === limit ? data[data.length - 1].created_at : null;

    return res.json({
      slots: (data || []).map((r) => {
        const event = r.events;
        const slot = { ...r };
        delete slot.events;
        return { slot, event };
      }),
      nextCursor,
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

export default router;
