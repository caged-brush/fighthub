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

interface SearchGymsQuery {
  q?: string;
  region?: string;
  city?: string;
}

interface GymParams extends ParamsDictionary {
  id: string;
}

interface GymMembershipRow {
  id: string;
  gym_id: string;
  user_id: string;
  role: GymMembershipRole;
  status: GymMembershipStatus;
  created_at?: string;
  updated_at?: string;
}

router.get(
  "/search",
  async (
    req: Request<
      unknown,
      { gyms: any[] } | ErrorResponse,
      unknown,
      SearchGymsQuery
    >,
    res: Response<{ gyms: any[] } | ErrorResponse>,
  ) => {
    try {
      const q = String(req.query.q || "").trim();
      const region = String(req.query.region || "").trim();
      const city = String(req.query.city || "").trim();

      let query = supabaseAdmin
        .from("gyms")
        .select(
          `
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
        `,
        )
        .order("created_at", { ascending: false })
        .limit(30);

      if (q) {
        query = query.ilike("name", `%${q}%`);
      }

      if (region) {
        query = query.eq("region", region);
      }

      if (city) {
        query = query.ilike("city", city);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({
        gyms: data || [],
      });
    } catch (err: any) {
      console.error("GET /gyms/search error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.get(
  "/:id",
  async (
    req: Request<GymParams, { gym: any; roster_count: number } | ErrorResponse>,
    res: Response<{ gym: any; roster_count: number } | ErrorResponse>,
  ) => {
    try {
      const gymId = req.params.id;

      const { data: gym, error: gymError } = await supabaseAdmin
        .from("gyms")
        .select(
          `
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
        `,
        )
        .eq("id", gymId)
        .maybeSingle();

      if (gymError) {
        return res.status(500).json({ message: gymError.message });
      }

      if (!gym) {
        return res.status(404).json({ message: "Gym not found." });
      }

      const { count, error: countError } = await supabaseAdmin
        .from("gym_memberships")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("status", "active");

      if (countError) {
        return res.status(500).json({ message: countError.message });
      }

      return res.status(200).json({
        gym,
        roster_count: count || 0,
      });
    } catch (err: any) {
      console.error("GET /gyms/:id error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.get(
  "/mine/memberships",
  requireAuth,
  async (
    req: Request,
    res: Response<{ memberships: any[] } | ErrorResponse>,
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
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
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({
        memberships: data || [],
      });
    } catch (err: any) {
      console.error("GET /gyms/mine/memberships error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.post<GymParams, OkResponse | ErrorResponse>(
  "/:id/join-request",
  requireAuth,
  async (req, res) => {
    try {
      const gymId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== "fighter") {
        return res.status(403).json({
          message: "Only fighters can request to join a gym.",
        });
      }

      const { data: gym, error: gymError } = await supabaseAdmin
        .from("gyms")
        .select("id")
        .eq("id", gymId)
        .maybeSingle();

      if (gymError) {
        return res.status(500).json({ message: gymError.message });
      }

      if (!gym) {
        return res.status(404).json({ message: "Gym not found." });
      }

      const { error } = await supabaseAdmin.from("gym_memberships").insert({
        gym_id: gymId,
        user_id: req.user.id,
        role: "fighter",
        status: "pending",
      });

      if (error) {
        const isDup =
          error.code === "23505" ||
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique");

        return res.status(isDup ? 409 : 500).json({
          message: isDup
            ? "You already have a membership or pending request for this gym."
            : error.message,
        });
      }

      return res.status(201).json({ ok: true });
    } catch (err: any) {
      console.error("POST /gyms/:id/join-request error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.delete<GymParams, OkResponse | ErrorResponse>(
  "/:id/leave",
  requireAuth,
  async (req, res) => {
    try {
      const gymId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("gym_memberships")
        .select("id, gym_id, user_id, role, status")
        .eq("gym_id", gymId)
        .eq("user_id", req.user.id)
        .maybeSingle<GymMembershipRow>();

      if (membershipError) {
        return res.status(500).json({ message: membershipError.message });
      }

      if (!membership) {
        return res.status(404).json({ message: "Membership not found." });
      }

      if (membership.role === "owner") {
        return res.status(403).json({
          message: "Gym owners cannot leave the gym from this route.",
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from("gym_memberships")
        .delete()
        .eq("id", membership.id);

      if (deleteError) {
        return res.status(500).json({ message: deleteError.message });
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("DELETE /gyms/:id/leave error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

router.get<GymParams, { membership: GymMembershipRow | null } | ErrorResponse>(
  "/:id/my-membership",
  requireAuth,
  async (req, res) => {
    try {
      const gymId = req.params.id;

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { data, error } = await supabaseAdmin
        .from("gym_memberships")
        .select("id, gym_id, user_id, role, status, created_at, updated_at")
        .eq("gym_id", gymId)
        .eq("user_id", req.user.id)
        .maybeSingle<GymMembershipRow>();

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({
        membership: data || null,
      });
    } catch (err: any) {
      console.error("GET /gyms/:id/my-membership error:", err);
      return res.status(500).json({
        message: err?.message || "Internal server error.",
      });
    }
  },
);

export default router;
