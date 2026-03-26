import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { supabaseAsUser } from "../config/supabaseUser.js";
import { supabaseAdmin } from "../config/supabase.js";
const router = express.Router();
function supaErr(err) {
    if (!err)
        return { message: "Unknown Supabase error" };
    return {
        message: err.message ||
            err.details ||
            err.hint ||
            err.code ||
            "Supabase error (no message/details)",
        code: err.code ?? null,
        details: err.details ?? null,
        hint: err.hint ?? null,
        status: err.status ?? null,
    };
}
function getErrorMessage(error, fallback = "Server error") {
    if (error instanceof Error)
        return error.message;
    if (typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string") {
        return error.message;
    }
    return fallback;
}
router.use((req, res, next) => {
    if (!supabaseAdmin) {
        console.error("[FIGHTS] supabaseAdmin undefined");
        return res.status(500).json({ message: "supabaseAdmin not configured" });
    }
    next();
});
router.post("/applications/:id/accept", requireAuth, async (req, res) => {
    const applicationId = req.params.id;
    const token = req.accessToken ||
        (req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.slice(7)
            : null);
    if (!token) {
        return res.status(401).json({ message: "Missing token" });
    }
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
    if (!req.supabaseUser?.id) {
        return res
            .status(401)
            .json({ message: "Not authenticated (missing supabase user)" });
    }
    try {
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
        const requiredEventFields = [
            "promotion_name",
            "title",
            "discipline",
            "region",
            "city",
            "venue",
            "event_date",
        ];
        for (const field of requiredEventFields) {
            if (!String(event[field] ?? "").trim()) {
                return res.status(400).json({ message: `Missing event.${field}` });
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
        for (const field of requiredSlotFields) {
            if (slot[field] === undefined ||
                slot[field] === null ||
                String(slot[field]).trim() === "") {
                return res.status(400).json({ message: `Missing slot.${field}` });
            }
        }
        const { data, error } = await supabaseAdmin.rpc("create_fight_opportunity", {
            p_creator_id: req.supabaseUser.id,
            p_event: event,
            p_slot: slot,
        });
        if (error) {
            console.error("[opportunities] rpc error", error);
            return res.status(400).json(supaErr(error));
        }
        const row = (Array.isArray(data) ? data[0] : data);
        if (!row?.event_id || !row?.slot_id) {
            return res
                .status(500)
                .json({ message: "RPC returned incomplete result" });
        }
        return res.json({
            ok: true,
            event: { id: row.event_id },
            slot: { id: row.slot_id },
        });
    }
    catch (e) {
        return res.status(500).json({ message: getErrorMessage(e) });
    }
});
router.get("/slots/:id", requireAuth, async (req, res) => {
    const slotId = req.params.id;
    const viewerId = req.supabaseUser?.id;
    if (!viewerId) {
        return res.status(401).json({
            message: "Not authenticated (missing supabase user)",
        });
    }
    const { data: slot, error: slotErr } = await supabaseAdmin
        .from("fight_slots")
        .select(`
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
      `)
        .eq("id", slotId)
        .maybeSingle();
    if (slotErr) {
        return res.status(500).json({ message: slotErr.message });
    }
    if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
    }
    const { data: event, error: eventErr } = await supabaseAdmin
        .from("events")
        .select(`
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
      `)
        .eq("id", slot.event_id)
        .maybeSingle();
    if (eventErr) {
        return res.status(500).json({ message: eventErr.message });
    }
    if (!event) {
        return res.status(404).json({ message: "Event not found" });
    }
    const isOwnerScout = req.user?.role === "scout" && event.created_by === viewerId;
    const isPublic = slot.status === "open";
    if (!isOwnerScout && !isPublic) {
        return res.status(403).json({
            message: "Not allowed to view this slot.",
        });
    }
    const { count, error: countErr } = await supabaseAdmin
        .from("fight_applications")
        .select("id", { count: "exact", head: true })
        .eq("fight_slot_id", slotId);
    if (countErr) {
        return res.status(500).json({ message: countErr.message });
    }
    let viewerStatus = null;
    if (req.user?.role === "fighter") {
        const { data: appRow, error: appErr } = await supabaseAdmin
            .from("fight_applications")
            .select("status")
            .eq("fight_slot_id", slotId)
            .eq("fighter_id", viewerId)
            .maybeSingle();
        if (appErr) {
            return res.status(500).json({ message: appErr.message });
        }
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
});
router.post("/slots/:id/apply", requireAuth, async (req, res) => {
    try {
        const slotId = req.params.id;
        const fighterId = req.supabaseUser?.id;
        if (!fighterId) {
            return res.status(401).json({
                message: "Not authenticated (missing supabase user)",
            });
        }
        if (req.user?.role !== "fighter") {
            return res.status(403).json({
                message: "Only fighters can apply.",
            });
        }
        const { data: slot, error: slotErr } = await supabaseAdmin
            .from("fight_slots")
            .select("id, event_id, status, allow_applications, application_deadline")
            .eq("id", slotId)
            .maybeSingle();
        if (slotErr) {
            return res.status(500).json({
                message: slotErr.message,
            });
        }
        if (!slot) {
            return res.status(404).json({
                message: "Slot not found.",
            });
        }
        if (slot.status !== "open") {
            return res.status(409).json({
                message: "This slot is not open.",
            });
        }
        if (!slot.allow_applications) {
            return res.status(409).json({
                message: "Applications are closed for this slot.",
            });
        }
        if (slot.application_deadline) {
            const deadline = new Date(slot.application_deadline).getTime();
            if (Number.isFinite(deadline) && Date.now() > deadline) {
                return res.status(409).json({
                    message: "Application deadline has passed.",
                });
            }
        }
        const { data: event, error: eventErr } = await supabaseAdmin
            .from("events")
            .select("id, created_by")
            .eq("id", slot.event_id)
            .maybeSingle();
        if (eventErr) {
            return res.status(500).json({
                message: eventErr.message,
            });
        }
        if (!event) {
            return res.status(404).json({
                message: "Parent event not found.",
            });
        }
        if (!event.created_by) {
            return res.status(500).json({
                message: "Event owner not found.",
            });
        }
        const { data: existing, error: existingErr } = await supabaseAdmin
            .from("fight_applications")
            .select("id, status")
            .eq("fight_slot_id", slotId)
            .eq("fighter_id", fighterId)
            .maybeSingle();
        if (existingErr) {
            return res.status(500).json({
                message: existingErr.message,
            });
        }
        if (existing) {
            return res.status(409).json({
                message: "You already applied to this slot.",
            });
        }
        const { data: created, error: createErr } = await supabaseAdmin
            .from("fight_applications")
            .insert({
            fight_slot_id: slotId,
            fighter_id: fighterId,
            poster_id: event.created_by,
            status: "submitted",
        })
            .select(`
          id,
          poster_id,
          fighter_id,
          fight_slot_id,
          status,
          note,
          highlight_video_url,
          viewed_at,
          scout_note,
          scout_score,
          created_at,
          updated_at
        `)
            .single();
        if (createErr) {
            console.error("fight application create error:", createErr);
            const msg = createErr.message || "Failed to apply.";
            const lower = msg.toLowerCase();
            const isDup = lower.includes("duplicate") || lower.includes("unique");
            return res.status(isDup ? 409 : 500).json({
                message: msg,
            });
        }
        return res.status(201).json({
            ok: true,
            application: created,
        });
    }
    catch (err) {
        console.error("POST /slots/:id/apply error:", err);
        return res.status(500).json({
            message: err?.message || "Internal server error.",
        });
    }
});
router.get("/open-slots", requireAuth, async (req, res) => {
    try {
        const parsedLimit = Number.parseInt(req.query.limit || "20", 10);
        const limit = Math.min(Number.isNaN(parsedLimit) ? 20 : parsedLimit, 50);
        const cursor = req.query.cursor || null;
        let q = supabaseAdmin
            .from("fight_slots")
            .select(`
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
          created_at
        `)
            .eq("status", "open")
            .order("created_at", { ascending: false })
            .limit(limit);
        if (cursor) {
            q = q.lt("created_at", cursor);
        }
        const { data: slots, error } = await q;
        if (error) {
            console.error("[open-slots] slots error", error);
            return res.status(500).json(supaErr(error));
        }
        const typedSlots = (slots ?? []);
        const nextCursor = typedSlots.length === limit
            ? (typedSlots[typedSlots.length - 1]?.created_at ?? null)
            : null;
        const eventIds = [
            ...new Set(typedSlots.map((s) => s.event_id).filter(Boolean)),
        ];
        let eventsById = {};
        if (eventIds.length) {
            const { data: events, error: eErr } = await supabaseAdmin
                .from("events")
                .select("id, promotion_name, title, region, city, venue, event_date, discipline, created_by")
                .in("id", eventIds);
            if (eErr) {
                return res.status(500).json(supaErr(eErr));
            }
            eventsById = Object.fromEntries((events ?? []).map((e) => [e.id, e]));
        }
        return res.json({
            slots: typedSlots.map((slot) => ({
                slot,
                event: eventsById[slot.event_id] || null,
            })),
            nextCursor,
        });
    }
    catch (e) {
        console.error("[GET /fights/open-slots] crash:", e);
        return res.status(500).json({ message: getErrorMessage(e) });
    }
});
router.get("/opportunities/mine", requireAuth, async (req, res) => {
    try {
        const viewerId = req.supabaseUser?.id;
        if (!viewerId) {
            return res.status(401).json({
                message: "Not authenticated (missing supabase user)",
            });
        }
        if (req.user?.role !== "scout") {
            return res.status(403).json({
                message: "Only scouts can view their published fights.",
            });
        }
        const { data: events, error: eventErr } = await supabaseAdmin
            .from("events")
            .select(`
          id,
          created_by,
          promotion_name,
          title,
          region,
          city,
          venue,
          event_date
        `)
            .eq("created_by", viewerId)
            .order("event_date", { ascending: false });
        if (eventErr) {
            return res.status(500).json({
                message: eventErr.message,
            });
        }
        const typedEvents = events ?? [];
        if (!typedEvents.length) {
            return res.json({ opportunities: [] });
        }
        const eventIds = typedEvents.map((e) => e.id);
        const eventMap = Object.fromEntries(typedEvents.map((e) => [e.id, e]));
        const { data: slots, error: slotErr } = await supabaseAdmin
            .from("fight_slots")
            .select(`
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
        `)
            .in("event_id", eventIds)
            .order("created_at", { ascending: false });
        if (slotErr) {
            return res.status(500).json({
                message: slotErr.message,
            });
        }
        const typedSlots = slots ?? [];
        const opportunities = typedSlots.map((slot) => {
            const event = eventMap[slot.event_id];
            return {
                id: slot.id,
                event_id: slot.event_id,
                discipline: slot.discipline,
                weight_class: slot.weight_class,
                target_weight_lbs: slot.target_weight_lbs ?? null,
                weight_tolerance_lbs: slot.weight_tolerance_lbs ?? null,
                min_experience: slot.min_experience ?? null,
                style_preferences: slot.style_preferences ?? null,
                allow_applications: slot.allow_applications,
                application_deadline: slot.application_deadline ?? null,
                travel_support: slot.travel_support ?? null,
                purse_cents: slot.purse_cents ?? null,
                status: slot.status,
                created_at: slot.created_at ?? null,
                updated_at: slot.updated_at ?? null,
                event_title: event?.title ?? null,
                promotion_name: event?.promotion_name ?? null,
                city: event?.city ?? null,
                region: event?.region ?? null,
                venue: event?.venue ?? null,
                event_date: event?.event_date ?? null,
            };
        });
        return res.json({ opportunities });
    }
    catch (e) {
        return res.status(500).json({
            message: getErrorMessage(e),
        });
    }
});
router.get("/applications/mine", requireAuth, async (req, res) => {
    try {
        const viewerId = req.supabaseUser?.id;
        if (!viewerId) {
            return res.status(401).json({
                message: "Not authenticated (missing supabase user)",
            });
        }
        if (req.user?.role !== "scout") {
            return res.status(403).json({
                message: "Only scouts can view applicants.",
            });
        }
        let applicationsQuery = supabaseAdmin
            .from("fight_applications")
            .select(`
          id,
          fight_slot_id,
          fighter_id,
          status,
          created_at
        `)
            .eq("poster_id", viewerId)
            .order("created_at", { ascending: false });
        if (req.query.slotId) {
            applicationsQuery = applicationsQuery.eq("fight_slot_id", req.query.slotId);
        }
        const { data: applications, error: appErr } = await applicationsQuery;
        if (appErr) {
            return res.status(500).json({
                message: appErr.message,
            });
        }
        const typedApps = applications ?? [];
        if (!typedApps.length) {
            return res.json({ applications: [] });
        }
        const slotIds = [...new Set(typedApps.map((a) => a.fight_slot_id))];
        const fighterIds = [...new Set(typedApps.map((a) => a.fighter_id))];
        const { data: slots, error: slotErr } = await supabaseAdmin
            .from("fight_slots")
            .select("id, event_id, discipline, weight_class")
            .in("id", slotIds);
        if (slotErr) {
            return res.status(500).json({
                message: slotErr.message,
            });
        }
        const typedSlots = slots ?? [];
        const slotMap = Object.fromEntries(typedSlots.map((s) => [s.id, s]));
        const eventIds = [...new Set(typedSlots.map((s) => s.event_id))];
        const { data: events, error: eventErr } = await supabaseAdmin
            .from("events")
            .select("id, title")
            .in("id", eventIds);
        if (eventErr) {
            return res.status(500).json({
                message: eventErr.message,
            });
        }
        const eventMap = Object.fromEntries((events ?? []).map((e) => [e.id, e]));
        const { data: fighters, error: fighterErr } = await supabaseAdmin
            .from("fighters")
            .select(`
          user_id,
          weight_class,
          wins,
          losses,
          draws,
          fight_style,
          weight,
          height,
          bio,
          gym,
          is_available
        `)
            .in("user_id", fighterIds);
        if (fighterErr) {
            return res.status(500).json({
                message: fighterErr.message,
            });
        }
        const { data: usersData, error: usersErr } = await supabaseAdmin
            .from("users")
            .select(`
          id,
          fname,
          lname,
          region,
          profile_picture_url
        `)
            .in("id", fighterIds);
        if (usersErr) {
            return res.status(500).json({
                message: usersErr.message,
            });
        }
        const fighterMap = Object.fromEntries((fighters ?? []).map((f) => [f.user_id, f]));
        const userMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]));
        const enriched = typedApps.map((app) => {
            const slot = slotMap[app.fight_slot_id];
            const event = slot ? eventMap[slot.event_id] : null;
            const fighter = fighterMap[app.fighter_id];
            const user = userMap[app.fighter_id];
            const wins = fighter?.wins ?? 0;
            const losses = fighter?.losses ?? 0;
            const draws = fighter?.draws ?? 0;
            return {
                id: app.id,
                fight_slot_id: app.fight_slot_id,
                fighter_id: app.fighter_id,
                status: app.status,
                created_at: app.created_at ?? null,
                fighter_first_name: user?.fname ?? null,
                fighter_last_name: user?.lname ?? null,
                fighter_name: [user?.fname, user?.lname].filter(Boolean).join(" ") || null,
                fighter_region: user?.region ?? null,
                fighter_profile_picture_url: user?.profile_picture_url ?? null,
                fighter_weight_class: fighter?.weight_class ?? null,
                fighter_style: fighter?.fight_style ?? null,
                fighter_weight: fighter?.weight ?? null,
                fighter_height: fighter?.height ?? null,
                fighter_bio: fighter?.bio ?? null,
                fighter_gym: fighter?.gym ?? null,
                fighter_is_available: fighter?.is_available ?? null,
                fighter_wins: wins,
                fighter_losses: losses,
                fighter_draws: draws,
                fighter_record: `${wins}-${losses}-${draws}`,
                event_title: event?.title ?? null,
                discipline: slot?.discipline ?? null,
                weight_class: slot?.weight_class ?? null,
            };
        });
        return res.json({ applications: enriched });
    }
    catch (e) {
        return res.status(500).json({
            message: getErrorMessage(e),
        });
    }
});
export default router;
