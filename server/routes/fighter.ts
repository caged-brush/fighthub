import express, { Request, Response, Router, RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParamsDictionary } from "express-serve-static-core";
import { supabaseAdmin } from "../config/supabase.js";

interface ErrorResponse {
  message: string;
}

interface FighterSearchQuery {
  weight_class?: string;
  min_wins?: string;
  style?: string;
  region?: string;
  limit?: string;
  offset?: string;
}

interface FighterParams extends ParamsDictionary {
  userId: string;
}

interface PublicUserInfo {
  fname?: string | null;
  lname?: string | null;
  profile_picture_url?: string | null;
  region?: string | null;
}

interface FighterRow {
  user_id: string;
  weight_class?: string | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  height?: number | null;
  weight?: number | null;
  fight_style?: string | null;
  gym?: string | null;
  bio?: string | null;
  is_available?: boolean | null;
  users?: PublicUserInfo | PublicUserInfo[] | null;
}

interface SearchUserIdRow {
  id: string;
}

interface FighterUpdateBody {
  weight_class?: string;
  date_of_birth?: string;
  region?: string;
  wins?: number | string | null;
  losses?: number | string | null;
  draws?: number | string | null;
  fight_style?: string;
  height?: number | string | null;
  weight?: number | string | null;
  gym?: string | null;
  bio?: string | null;
  is_available?: boolean | null;
}

interface FighterUpdateResponse {
  message: string;
  fighter: FighterRow;
  fighter_onboarded: true;
}

interface UserUpdatePayload {
  fighter_onboarded: boolean;
  region: string;
  date_of_birth?: string;
}

interface GymSearchQuery {
  q?: string;
  city?: string;
  region?: string;
  limit?: string;
  offset?: string;
}

interface GymRow {
  id: string;
  name: string;
  bio?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  website?: string | null;
  instagram?: string | null;
  logo_path?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface FighterGymMembershipRow {
  id: string;
  gym_id: string;
  user_id: string;
  role: "owner" | "coach" | "staff" | "fighter";
  status: "pending" | "active" | "rejected" | "revoked";
  created_at?: string;
  updated_at?: string;
  gyms?: GymRow | GymRow[] | null;
}
interface JoinGymParams extends ParamsDictionary {
  gymId: string;
}

interface JoinGymResponse {
  ok: true;
  membership: FighterGymMembershipRow;
}

interface MyGymsResponse {
  memberships: FighterGymMembershipRow[];
}

function getErrorMessage(error: unknown, fallback = "Server error"): string {
  if (error instanceof Error) return error.message;
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

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

export default function fightersRoutes(
  supabase: SupabaseClient,
  requireAuth: RequestHandler,
): Router {
  const router = express.Router();

  router.get(
    "/search",
    async (
      req: Request<
        unknown,
        FighterRow[] | ErrorResponse,
        unknown,
        FighterSearchQuery
      >,
      res: Response<FighterRow[] | ErrorResponse>,
    ) => {
      const {
        weight_class,
        min_wins,
        style,
        region,
        limit = "20",
        offset = "0",
      } = req.query;

      try {
        let userIds: string[] | null = null;

        if (region && String(region).trim()) {
          const regionQuery = String(region).trim();

          const { data: users, error: usersErr } = await supabase
            .from("users")
            .select("id")
            .ilike("region", `%${regionQuery}%`);

          if (usersErr) throw usersErr;

          userIds = ((users ?? []) as SearchUserIdRow[]).map((u) => u.id);

          if (userIds.length === 0) {
            return res.status(200).json([]);
          }
        }

        const parsedLimit = Number.parseInt(String(limit), 10);
        const parsedOffset = Number.parseInt(String(offset), 10);

        const safeLimit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;
        const safeOffset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;

        let query = supabase
          .from("fighters")
          .select(
            `
            user_id,
            weight_class,
            wins,
            losses,
            draws,
            height,
            weight,
            fight_style,
            gym,
            bio,
            is_available,
            users (
              fname,
              lname,
              profile_picture_url,
              region
            )
          `,
          )
          .order("wins", { ascending: false })
          .range(safeOffset, safeOffset + safeLimit - 1);

        if (weight_class) {
          query = query.eq("weight_class", weight_class);
        }

        if (min_wins !== undefined && String(min_wins).trim() !== "") {
          query = query.gte("wins", Number(min_wins));
        }

        if (style && String(style).trim()) {
          query = query.textSearch("fight_style", String(style).trim(), {
            type: "websearch",
          });
        }

        if (userIds) {
          query = query.in("user_id", userIds);
        }

        const { data, error } = await query;

        if (error) throw error;

        return res.status(200).json((data ?? []) as FighterRow[]);
      } catch (err) {
        console.error("GET /fighters/search error:", getErrorMessage(err));
        return res.status(500).json({ message: "Search failed" });
      }
    },
  );

  router.get(
    "/:userId",
    async (
      req: Request<FighterParams, FighterRow | ErrorResponse>,
      res: Response<FighterRow | ErrorResponse>,
    ) => {
      const { userId } = req.params;

      try {
        const { data, error } = await supabase
          .from("fighters")
          .select(
            `
            *,
            users (
              fname,
              lname,
              profile_picture_url,
              region
            )
          `,
          )
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        return res.status(200).json(data as FighterRow);
      } catch {
        return res.status(404).json({ message: "Fighter not found" });
      }
    },
  );

  router.put(
    "/me",
    requireAuth,
    async (
      req: Request<
        unknown,
        FighterUpdateResponse | ErrorResponse,
        FighterUpdateBody
      >,
      res: Response<FighterUpdateResponse | ErrorResponse>,
    ) => {
      const userId = req.user?.id;
      const role = req.user?.role;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (role !== "fighter") {
        return res
          .status(403)
          .json({ message: "Only fighters can edit profiles" });
      }

      const {
        weight_class,
        date_of_birth,
        region,
        wins,
        losses,
        draws,
        fight_style,
        height,
        weight,
        gym,
        bio,
        is_available,
      } = req.body;

      const ALLOWED_REGIONS = new Set([
        "BC",
        "AB",
        "SK",
        "MB",
        "ON",
        "QC",
        "NB",
        "NS",
        "PE",
        "NL",
        "YT",
        "NT",
        "NU",
      ]);

      const regionClean =
        typeof region === "string" ? region.trim().toUpperCase() : "";

      if (!regionClean) {
        return res.status(400).json({ message: "Region is required." });
      }

      if (!ALLOWED_REGIONS.has(regionClean)) {
        return res.status(400).json({
          message:
            "Invalid region. Must be a Canadian province/territory code (e.g., BC, ON).",
        });
      }

      const w = toNullableNumber(wins);
      const l = toNullableNumber(losses);
      const d = toNullableNumber(draws);
      const h = toNullableNumber(height);
      const wt = toNullableNumber(weight);

      if (
        [w, l, d, h, wt].some(
          (n) => n !== null && (!Number.isFinite(n) || n < 0),
        )
      ) {
        return res.status(400).json({ message: "Invalid numeric values" });
      }

      const gymClean = typeof gym === "string" ? gym.trim() : null;
      const bioClean = typeof bio === "string" ? bio.trim() : null;
      const avail =
        is_available === undefined || is_available === null
          ? null
          : Boolean(is_available);

      try {
        const { data: fighter, error: fighterErr } = await supabaseAdmin
          .from("fighters")
          .upsert(
            {
              user_id: userId,
              weight_class: weight_class ?? null,
              wins: w ?? 0,
              losses: l ?? 0,
              draws: d ?? 0,
              fight_style: fight_style ?? null,
              height: h,
              weight: wt,
              gym: gymClean,
              bio: bioClean,
              is_available: avail ?? true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          )
          .select()
          .single();

        if (fighterErr) throw fighterErr;

        const userUpdate: UserUpdatePayload = {
          fighter_onboarded: true,
          region: regionClean,
        };

        if (date_of_birth) {
          userUpdate.date_of_birth = date_of_birth;
        }

        const { error: userErr } = await supabase
          .from("users")
          .update(userUpdate)
          .eq("id", userId);

        if (userErr) throw userErr;

        return res.status(200).json({
          message: "Fighter profile saved",
          fighter: fighter as FighterRow,
          fighter_onboarded: true,
        });
      } catch (err) {
        console.error("PUT /fighters/me error:", getErrorMessage(err));
        return res.status(500).json({ message: "Failed to update fighter" });
      }
    },
  );

  router.get(
    "/gyms/search",
    async (
      req: Request<unknown, GymRow[] | ErrorResponse, unknown, GymSearchQuery>,
      res: Response<GymRow[] | ErrorResponse>,
    ) => {
      const { q, city, region, limit = "20", offset = "0" } = req.query;

      try {
        const parsedLimit = Number.parseInt(String(limit), 10);
        const parsedOffset = Number.parseInt(String(offset), 10);

        const safeLimit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;
        const safeOffset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;

        let query = supabase
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
          .range(safeOffset, safeOffset + safeLimit - 1);

        if (q && String(q).trim()) {
          const term = String(q).trim();
          query = query.or(
            `name.ilike.%${term}%,bio.ilike.%${term}%,city.ilike.%${term}%,region.ilike.%${term}%`,
          );
        }

        if (city && String(city).trim()) {
          query = query.ilike("city", `%${String(city).trim()}%`);
        }

        if (region && String(region).trim()) {
          query = query.ilike("region", `%${String(region).trim()}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return res.status(200).json((data ?? []) as GymRow[]);
      } catch (err) {
        console.error("GET /fighters/gyms/search error:", getErrorMessage(err));
        return res.status(500).json({ message: "Failed to search gyms" });
      }
    },
  );

  router.get(
    "/gyms/my-memberships",
    requireAuth,
    async (
      req: Request<unknown, MyGymsResponse | ErrorResponse>,
      res: Response<MyGymsResponse | ErrorResponse>,
    ) => {
      const userId = req.user?.id;
      const role = req.user?.role;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (role !== "fighter") {
        return res
          .status(403)
          .json({ message: "Only fighters can access this." });
      }

      try {
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
          .eq("user_id", userId)
          .eq("role", "fighter")
          .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
          memberships: (data ?? []) as FighterGymMembershipRow[],
        });
      } catch (err) {
        console.error(
          "GET /fighters/gyms/my-memberships error:",
          getErrorMessage(err),
        );
        return res
          .status(500)
          .json({ message: "Failed to load gym memberships" });
      }
    },
  );

  router.post(
    "/gyms/:gymId/join-request",
    requireAuth,
    async (
      req: Request<JoinGymParams, JoinGymResponse | ErrorResponse>,
      res: Response<JoinGymResponse | ErrorResponse>,
    ) => {
      const userId = req.user?.id;
      const role = req.user?.role;
      const { gymId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (role !== "fighter") {
        return res
          .status(403)
          .json({ message: "Only fighters can request to join gyms." });
      }

      try {
        const { data: gym, error: gymErr } = await supabaseAdmin
          .from("gyms")
          .select("id")
          .eq("id", gymId)
          .maybeSingle();

        if (gymErr) throw gymErr;
        if (!gym) {
          return res.status(404).json({ message: "Gym not found." });
        }

        const { data: existing, error: existingErr } = await supabaseAdmin
          .from("gym_memberships")
          .select("id, gym_id, user_id, role, status, created_at, updated_at")
          .eq("gym_id", gymId)
          .eq("user_id", userId)
          .eq("role", "fighter")
          .maybeSingle();

        if (existingErr) throw existingErr;

        if (existing) {
          if (existing.status === "pending") {
            return res.status(409).json({
              message: "Join request already pending.",
            });
          }

          if (existing.status === "active") {
            return res.status(409).json({
              message: "You are already a member of this gym.",
            });
          }

          const { data: updated, error: updateErr } = await supabaseAdmin
            .from("gym_memberships")
            .update({
              status: "pending",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .select("*")
            .single();

          if (updateErr) throw updateErr;

          return res.status(200).json({
            ok: true,
            membership: updated as FighterGymMembershipRow,
          });
        }

        const { data: membership, error: insertErr } = await supabaseAdmin
          .from("gym_memberships")
          .insert({
            gym_id: gymId,
            user_id: userId,
            role: "fighter",
            status: "pending",
          })
          .select("*")
          .single();

        if (insertErr) throw insertErr;

        return res.status(201).json({
          ok: true,
          membership: membership as FighterGymMembershipRow,
        });
      } catch (err) {
        console.error(
          "POST /fighters/gyms/:gymId/join-request error:",
          getErrorMessage(err),
        );
        return res
          .status(500)
          .json({ message: "Failed to submit join request" });
      }
    },
  );

  router.delete(
    "/gyms/:gymId/join-request",
    requireAuth,
    async (
      req: Request<JoinGymParams, { ok: true } | ErrorResponse>,
      res: Response<{ ok: true } | ErrorResponse>,
    ) => {
      const userId = req.user?.id;
      const role = req.user?.role;
      const { gymId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (role !== "fighter") {
        return res
          .status(403)
          .json({ message: "Only fighters can cancel join requests." });
      }

      try {
        const { data: membership, error: findErr } = await supabaseAdmin
          .from("gym_memberships")
          .select("id, status, role")
          .eq("gym_id", gymId)
          .eq("user_id", userId)
          .eq("role", "fighter")
          .maybeSingle();

        if (findErr) throw findErr;

        if (!membership) {
          return res.status(404).json({ message: "No request found." });
        }

        if (membership.status !== "pending") {
          return res.status(409).json({
            message: "Only pending requests can be cancelled.",
          });
        }

        const { error: deleteErr } = await supabaseAdmin
          .from("gym_memberships")
          .delete()
          .eq("id", membership.id);

        if (deleteErr) throw deleteErr;

        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error(
          "DELETE /fighters/gyms/:gymId/join-request error:",
          getErrorMessage(err),
        );
        return res
          .status(500)
          .json({ message: "Failed to cancel join request" });
      }
    },
  );

  return router;
}
