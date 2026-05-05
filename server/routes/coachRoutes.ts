import express, { Request, Response } from "express";
import requireAuth from "../middleware/requireAuth.js";
import { supabaseAdmin } from "../config/supabase.js";
import type { ParamsDictionary } from "express-serve-static-core";

const router = express.Router();

type GymMembershipRole = "owner" | "coach" | "staff" | "fighter";
type GymMembershipStatus = "pending" | "active" | "rejected" | "revoked";

interface ErrorResponse {
  message: string;
}

interface OkResponse {
  ok: true;
}

interface CreateGymBody {
  name?: string;
  bio?: string;
  city?: string;
  region?: string;
  country?: string;
  website?: string;
  instagram?: string;
  logo_path?: string;
}

interface CoachFighterApplicationsParams extends ParamsDictionary {
  fighterId: string;
}

interface CoachFighterApplicationsQuery extends qs.ParsedQs {
  gymId?: string;
}

interface CoachFighterApplicationsResponse {
  applications: Array<{
    id: string;
    fight_slot_id: string;
    fighter_id: string;
    status: string;
    created_at?: string | null;

    endorsement_status?: string | null;
    endorsement_note?: string | null;
    endorsed_by_coach_user_id?: string | null;

    event_title?: string | null;
    promotion_name?: string | null;
    discipline?: string | null;
    weight_class?: string | null;
    event_date?: string | null;
    city?: string | null;
    region?: string | null;
  }>;
}

interface GymManagementAccess {
  gym_id: string;
  user_id: string;
  role: GymMembershipRole;
  status: GymMembershipStatus;
}

async function getGymManagementAccess(
  gymId: string,
  userId: string,
): Promise<GymManagementAccess | null> {
  const { data, error } = await supabaseAdmin
    .from("gym_memberships")
    .select("gym_id, user_id, role, status")
    .eq("gym_id", gymId)
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "coach", "staff"])
    .maybeSingle<GymManagementAccess>();

  if (error) throw error;
  return data;
}

function getErrorMessage(error: unknown, fallback = "Server error"): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

router.get(
  "/dashboard",
  requireAuth,
  async (req: Request, res: Response<{ gyms: any[] } | ErrorResponse>) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== "coach") {
        return res
          .status(403)
          .json({ message: "Only coaches can access this." });
      }

      const { data, error } = await supabaseAdmin
        .from("gym_memberships")
        .select(
          `
          gym_id,
          role,
          status,
          gyms (
            id,
            name,
            bio,
            city,
            region,
            country,
            website,
            instagram,
            logo_path,
            created_by,
            created_at,
            updated_at
          )
        `,
        )
        .eq("user_id", req.user.id)
        .eq("status", "active")
        .in("role", ["owner", "coach", "staff"]);

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({
        gyms: data || [],
      });
    } catch (err: any) {
      console.error("GET /coach/dashboard error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.post(
  "/gyms",
  requireAuth,
  async (
    req: Request<
      unknown,
      { ok: true; gym: any } | ErrorResponse,
      CreateGymBody
    >,
    res: Response<{ ok: true; gym: any } | ErrorResponse>,
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== "coach") {
        return res
          .status(403)
          .json({ message: "Only coaches can create gyms." });
      }

      const {
        name,
        bio,
        city,
        region,
        country = "Canada",
        website,
        instagram,
        logo_path,
      } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ message: "Gym name is required." });
      }

      const { data: gym, error: gymError } = await supabaseAdmin
        .from("gyms")
        .insert({
          name: name.trim(),
          bio: bio?.trim() || null,
          city: city?.trim() || null,
          region: region?.trim() || null,
          country: country?.trim() || "Canada",
          website: website?.trim() || null,
          instagram: instagram?.trim() || null,
          logo_path: logo_path || null,
          created_by: req.user.id,
        })
        .select("*")
        .single();

      if (gymError || !gym) {
        return res.status(500).json({
          message: gymError?.message || "Failed to create gym.",
        });
      }

      const { error: membershipError } = await supabaseAdmin
        .from("gym_memberships")
        .insert({
          gym_id: gym.id,
          user_id: req.user.id,
          role: "owner",
          status: "active",
        });

      if (membershipError) {
        return res.status(500).json({
          message: membershipError.message,
        });
      }

      return res.status(201).json({
        ok: true,
        gym,
      });
    } catch (err: any) {
      console.error("POST /coach/gyms error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.get(
  "/gyms/:id",
  requireAuth,
  async (
    req: Request<{ id: string }, { gym: any } | ErrorResponse>,
    res: Response<{ gym: any } | ErrorResponse>,
  ) => {
    try {
      const gymId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const access = await getGymManagementAccess(gymId, req.user.id);

      if (!access) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const { data: gym, error } = await supabaseAdmin
        .from("gyms")
        .select("*")
        .eq("id", gymId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      if (!gym) {
        return res.status(404).json({ message: "Gym not found." });
      }

      return res.status(200).json({ gym });
    } catch (err: any) {
      console.error("GET /coach/gyms/:id error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.patch(
  "/gyms/:id",
  requireAuth,
  async (
    req: Request<
      { id: string },
      { ok: true; gym: any } | ErrorResponse,
      CreateGymBody
    >,
    res: Response<{ ok: true; gym: any } | ErrorResponse>,
  ) => {
    try {
      const gymId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const access = await getGymManagementAccess(gymId, req.user.id);

      if (!access) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const patch: Record<string, any> = {};

      if (typeof req.body.name === "string") {
        const value = req.body.name.trim();
        if (value.length < 2) {
          return res.status(400).json({ message: "Gym name is too short." });
        }
        patch.name = value;
      }

      if (typeof req.body.bio === "string")
        patch.bio = req.body.bio.trim() || null;
      if (typeof req.body.city === "string")
        patch.city = req.body.city.trim() || null;
      if (typeof req.body.region === "string")
        patch.region = req.body.region.trim() || null;
      if (typeof req.body.country === "string")
        patch.country = req.body.country.trim() || null;
      if (typeof req.body.website === "string")
        patch.website = req.body.website.trim() || null;
      if (typeof req.body.instagram === "string")
        patch.instagram = req.body.instagram.trim() || null;
      if (typeof req.body.logo_path === "string")
        patch.logo_path = req.body.logo_path.trim() || null;

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ message: "No valid fields to update." });
      }

      const { data: gym, error } = await supabaseAdmin
        .from("gyms")
        .update(patch)
        .eq("id", gymId)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({
        ok: true,
        gym,
      });
    } catch (err: any) {
      console.error("PATCH /coach/gyms/:id error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.get(
  "/gyms/:id/requests",
  requireAuth,
  async (
    req: Request<{ id: string }, { requests: any[] } | ErrorResponse>,
    res: Response<{ requests: any[] } | ErrorResponse>,
  ) => {
    try {
      const gymId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const access = await getGymManagementAccess(gymId, req.user.id);

      if (!access) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const { data: memberships, error: membershipsError } = await supabaseAdmin
        .from("gym_memberships")
        .select(
          `
          id,
          gym_id,
          user_id,
          role,
          status,
          created_at,
          updated_at
        `,
        )
        .eq("gym_id", gymId)
        .eq("role", "fighter")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (membershipsError) {
        return res.status(500).json({ message: membershipsError.message });
      }

      const rows = memberships || [];
      const userIds = [
        ...new Set(rows.map((row) => row.user_id).filter(Boolean)),
      ];

      let usersById = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from("users")
          .select(
            `
            id,
            role,
            fname,
            lname,
            profile_picture_url
          `,
          )
          .in("id", userIds);

        if (usersError) {
          return res.status(500).json({ message: usersError.message });
        }

        usersById = new Map((users || []).map((user) => [user.id, user]));
      }

      const requests = rows.map((row) => ({
        ...row,
        users: usersById.get(row.user_id) || null,
      }));

      return res.status(200).json({ requests });
    } catch (err: any) {
      console.error("GET /coach/gyms/:id/requests error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.get(
  "/gyms/:id/roster",
  requireAuth,
  async (
    req: Request<{ id: string }, { roster: any[] } | ErrorResponse>,
    res: Response<{ roster: any[] } | ErrorResponse>,
  ) => {
    try {
      const gymId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const access = await getGymManagementAccess(gymId, req.user.id);

      if (!access) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const { data: memberships, error: membershipsError } = await supabaseAdmin
        .from("gym_memberships")
        .select(
          `
          id,
          gym_id,
          user_id,
          role,
          status,
          created_at,
          updated_at
        `,
        )
        .eq("gym_id", gymId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (membershipsError) {
        return res.status(500).json({ message: membershipsError.message });
      }

      const rows = memberships || [];
      const userIds = [
        ...new Set(rows.map((row) => row.user_id).filter(Boolean)),
      ];

      let usersById = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from("users")
          .select(
            `
            id,
            role,
            fname,
            lname,
            profile_picture_url
          `,
          )
          .in("id", userIds);

        if (usersError) {
          return res.status(500).json({ message: usersError.message });
        }

        usersById = new Map((users || []).map((user) => [user.id, user]));
      }

      const roster = rows.map((row) => ({
        ...row,
        users: usersById.get(row.user_id) || null,
      }));

      return res.status(200).json({ roster });
    } catch (err: any) {
      console.error("GET /coach/gyms/:id/roster error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.post(
  "/gyms/:gymId/memberships/:membershipId/approve",
  requireAuth,
  async (
    req: Request<
      { gymId: string; membershipId: string },
      OkResponse | ErrorResponse
    >,
    res: Response<OkResponse | ErrorResponse>,
  ) => {
    try {
      const { gymId, membershipId } = req.params;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const access = await getGymManagementAccess(gymId, req.user.id);

      if (!access) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("gym_memberships")
        .select("id, gym_id, user_id, role, status")
        .eq("id", membershipId)
        .eq("gym_id", gymId)
        .maybeSingle();

      if (membershipError) {
        return res.status(500).json({ message: membershipError.message });
      }

      if (!membership) {
        return res.status(404).json({ message: "Membership not found." });
      }

      if (membership.role !== "fighter" || membership.status !== "pending") {
        return res.status(409).json({
          message: "This membership cannot be approved.",
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("gym_memberships")
        .update({ status: "active" })
        .eq("id", membershipId);

      if (updateError) {
        return res.status(500).json({ message: updateError.message });
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error(
        "POST /coach/gyms/:gymId/memberships/:membershipId/approve error:",
        err,
      );
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.post(
  "/gyms/:gymId/memberships/:membershipId/reject",
  requireAuth,
  async (
    req: Request<
      { gymId: string; membershipId: string },
      OkResponse | ErrorResponse
    >,
    res: Response<OkResponse | ErrorResponse>,
  ) => {
    try {
      const { gymId, membershipId } = req.params;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const access = await getGymManagementAccess(gymId, req.user.id);

      if (!access) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("gym_memberships")
        .select("id, gym_id, user_id, role, status")
        .eq("id", membershipId)
        .eq("gym_id", gymId)
        .maybeSingle();

      if (membershipError) {
        return res.status(500).json({ message: membershipError.message });
      }

      if (!membership) {
        return res.status(404).json({ message: "Membership not found." });
      }

      if (membership.role !== "fighter" || membership.status !== "pending") {
        return res.status(409).json({
          message: "This membership cannot be rejected.",
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("gym_memberships")
        .update({ status: "rejected" })
        .eq("id", membershipId);

      if (updateError) {
        return res.status(500).json({ message: updateError.message });
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error(
        "POST /coach/gyms/:gymId/memberships/:membershipId/reject error:",
        err,
      );
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.delete(
  "/gyms/:gymId/memberships/:membershipId",
  requireAuth,
  async (
    req: Request<
      { gymId: string; membershipId: string },
      OkResponse | ErrorResponse
    >,
    res: Response<OkResponse | ErrorResponse>,
  ) => {
    try {
      const { gymId, membershipId } = req.params;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const access = await getGymManagementAccess(gymId, req.user.id);

      if (!access) {
        return res.status(403).json({ message: "Not allowed." });
      }

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("gym_memberships")
        .select("id, gym_id, user_id, role, status")
        .eq("id", membershipId)
        .eq("gym_id", gymId)
        .maybeSingle();

      if (membershipError) {
        return res.status(500).json({ message: membershipError.message });
      }

      if (!membership) {
        return res.status(404).json({ message: "Membership not found." });
      }

      if (membership.role === "owner") {
        return res.status(403).json({
          message: "Owner membership cannot be removed here.",
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from("gym_memberships")
        .delete()
        .eq("id", membershipId);

      if (deleteError) {
        return res.status(500).json({ message: deleteError.message });
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error(
        "DELETE /coach/gyms/:gymId/memberships/:membershipId error:",
        err,
      );
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.post(
  "/onboarding/complete",
  requireAuth,
  async (req: Request, res: Response<{ ok: true } | { message: string }>) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== "coach") {
        return res
          .status(403)
          .json({ message: "Only coaches can complete this onboarding." });
      }

      const { error } = await supabaseAdmin
        .from("users")
        .update({ coach_onboarded: true })
        .eq("id", req.user.id);

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("POST /coach/onboarding/complete error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.get<
  CoachFighterApplicationsParams,
  CoachFighterApplicationsResponse | ErrorResponse,
  unknown,
  CoachFighterApplicationsQuery
>("/fighters/:fighterId/applications", requireAuth, async (req, res) => {
  try {
    const fighterId = req.params.fighterId;
    const gymId = req.query.gymId;
    const coachUserId = req.supabaseUser?.id;

    if (!coachUserId) {
      return res.status(401).json({
        message: "Not authenticated.",
      });
    }

    if (req.user?.role !== "coach") {
      return res.status(403).json({
        message: "Only coaches can view fighter applications.",
      });
    }

    if (!gymId || typeof gymId !== "string") {
      return res.status(400).json({
        message: "gymId is required.",
      });
    }

    const access = await getGymManagementAccess(gymId, coachUserId);

    if (!access) {
      return res.status(403).json({
        message: "Not allowed.",
      });
    }

    const { data: fighterMembership, error: fighterMembershipErr } =
      await supabaseAdmin
        .from("gym_memberships")
        .select(
          `
            id,
            gym_id,
            user_id,
            role,
            status
          `,
        )
        .eq("gym_id", gymId)
        .eq("user_id", fighterId)
        .eq("role", "fighter")
        .eq("status", "active")
        .maybeSingle();

    if (fighterMembershipErr) {
      return res.status(500).json({
        message: fighterMembershipErr.message,
      });
    }

    if (!fighterMembership) {
      return res.status(403).json({
        message: "Fighter is not an active member of this gym.",
      });
    }

    const { data: applications, error: appErr } = await supabaseAdmin
      .from("fight_applications")
      .select(
        `
          id,
          fight_slot_id,
          fighter_id,
          status,
          created_at,
          endorsement_status,
          endorsement_note,
          endorsed_by_coach_user_id
        `,
      )
      .eq("fighter_id", fighterId)
      .order("created_at", { ascending: false });

    if (appErr) {
      return res.status(500).json({
        message: appErr.message,
      });
    }

    const typedApps =
      (applications as Array<{
        id: string;
        fight_slot_id: string;
        fighter_id: string;
        status: string;
        created_at?: string | null;

        endorsement_status?: string | null;
        endorsement_note?: string | null;
        endorsed_by_coach_user_id?: string | null;
      }> | null) ?? [];

    if (!typedApps.length) {
      return res.json({
        applications: [],
      });
    }

    const slotIds = [...new Set(typedApps.map((a) => a.fight_slot_id))];

    const { data: slots, error: slotErr } = await supabaseAdmin
      .from("fight_slots")
      .select(
        `
          id,
          event_id,
          discipline,
          weight_class
        `,
      )
      .in("id", slotIds);

    if (slotErr) {
      return res.status(500).json({
        message: slotErr.message,
      });
    }

    const typedSlots =
      (slots as Array<{
        id: string;
        event_id: string;
        discipline?: string | null;
        weight_class?: string | null;
      }> | null) ?? [];

    const slotMap = Object.fromEntries(
      typedSlots.map((slot) => [slot.id, slot]),
    );

    const eventIds = [...new Set(typedSlots.map((slot) => slot.event_id))];

    const { data: events, error: eventErr } = await supabaseAdmin
      .from("events")
      .select(
        `
          id,
          title,
          promotion_name,
          event_date,
          city,
          region
        `,
      )
      .in("id", eventIds);

    if (eventErr) {
      return res.status(500).json({
        message: eventErr.message,
      });
    }

    const typedEvents =
      (events as Array<{
        id: string;
        title?: string | null;
        promotion_name?: string | null;
        event_date?: string | null;
        city?: string | null;
        region?: string | null;
      }> | null) ?? [];

    const eventMap = Object.fromEntries(
      typedEvents.map((event) => [event.id, event]),
    );

    const enriched = typedApps.map((app) => {
      const slot = slotMap[app.fight_slot_id];
      const event = slot ? eventMap[slot.event_id] : null;

      return {
        id: app.id,
        fight_slot_id: app.fight_slot_id,
        fighter_id: app.fighter_id,
        status: app.status,
        created_at: app.created_at ?? null,

        endorsement_status: app.endorsement_status ?? "none",
        endorsement_note: app.endorsement_note ?? null,
        endorsed_by_coach_user_id: app.endorsed_by_coach_user_id ?? null,

        event_title: event?.title ?? null,
        promotion_name: event?.promotion_name ?? null,
        discipline: slot?.discipline ?? null,
        weight_class: slot?.weight_class ?? null,
        event_date: event?.event_date ?? null,
        city: event?.city ?? null,
        region: event?.region ?? null,
      };
    });

    return res.json({
      applications: enriched,
    });
  } catch (e) {
    return res.status(500).json({
      message: getErrorMessage(e),
    });
  }
});

router.delete(
  "/gyms/:id",
  requireAuth,
  async (
    req: Request<{ id: string }, OkResponse | ErrorResponse>,
    res: Response<OkResponse | ErrorResponse>,
  ) => {
    try {
      const gymId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const access = await getGymManagementAccess(gymId, req.user.id);

      if (!access) {
        return res.status(403).json({ message: "Not allowed." });
      }

      if (access.role !== "owner") {
        return res.status(403).json({
          message: "Only the gym owner can delete this gym.",
        });
      }

      const { error } = await supabaseAdmin
        .from("gyms")
        .delete()
        .eq("id", gymId);

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("DELETE /coach/gyms/:id error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

export default router;
