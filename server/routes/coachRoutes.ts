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

      const { data, error } = await supabaseAdmin
        .from("gym_memberships")
        .select(
          `
          id,
          gym_id,
          user_id,
          role,
          status,
          created_at,
          updated_at,
          users (
            id,
            role,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("gym_id", gymId)
        .eq("role", "fighter")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({
        requests: data || [],
      });
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

      const { data, error } = await supabaseAdmin
        .from("gym_memberships")
        .select(
          `
          id,
          gym_id,
          user_id,
          role,
          status,
          created_at,
          updated_at,
          users (
            id,
            role,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("gym_id", gymId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({
        roster: data || [],
      });
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

export default router;
