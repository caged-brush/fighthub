import express, { Request, Response, Router } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../config/supabase.js";
import type { UserRole } from "../types/domain.js";

interface FighterStats {
  weight_class?: string | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  height?: number | null;
  weight?: number | null;
  fight_style?: string | null;
}

interface UserRoleRow {
  role: UserRole;
}

interface FighterUserRow {
  id: string;
  fname?: string | null;
  lname?: string | null;
  profile_picture_url?: string | null;
  fighters?: FighterStats | FighterStats[] | null;
  user_roles?: UserRoleRow[] | null;
}

interface ProcessedFighterUser {
  id: string;
  fname?: string | null;
  profile_picture_url?: string | null;
  fighter: FighterStats | FighterStats[] | null;
  profile_signed_url?: string;
}

interface LastMessageRow {
  message?: string | null;
  timestamp?: string | null;
}

interface UsersQuery {
  exclude?: string;
}

interface UserParams {
  id: string;
}

interface SetRoleBody {
  role?: UserRole;
}

interface ErrorResponse {
  message?: string;
  error?: string;
}

interface LastMessageResponse {
  last_message: string | null;
  timestamp: string | null;
}

interface SetRoleResponse {
  message: string;
}

export default function usersRoute(supabase: SupabaseClient): Router {
  const router = express.Router();

  /**
   * GET /users
   * Returns fighter profiles only
   */
  router.get(
    "/users",
    async (
      req: Request<
        unknown,
        ProcessedFighterUser[] | ErrorResponse,
        unknown,
        UsersQuery
      >,
      res: Response<ProcessedFighterUser[] | ErrorResponse>,
    ) => {
      const { exclude } = req.query;

      try {
        let query = supabase
          .from("users")
          .select(
            `
            id,
            fname,
            profile_picture_url,
            fighters (
              weight_class,
              wins,
              losses,
              draws,
              height,
              weight
            ),
            user_roles!inner (
              role
            )
          `,
          )
          .eq("user_roles.role", "fighter");

        if (exclude) {
          query = query.neq("id", exclude);
        }

        const { data: users, error } = await query;

        if (error) throw error;

        const processedUsers: ProcessedFighterUser[] = (users ?? []).map(
          (user: FighterUserRow) => ({
            id: user.id,
            fname: user.fname,
            profile_picture_url: user.profile_picture_url,
            fighter: user.fighters ?? null,
          }),
        );

        await Promise.all(
          processedUsers.map(async (user) => {
            if (!user.profile_picture_url) return;

            const { data } = await supabaseAdmin.storage
              .from("profiles")
              .createSignedUrl(user.profile_picture_url, 3600);

            if (data?.signedUrl) {
              user.profile_signed_url = data.signedUrl;
            }
          }),
        );

        return res.status(200).json(processedUsers);
      } catch (err) {
        console.error("Users fetch error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  /**
   * GET /users/:id
   * Public fighter profile
   */
  router.get(
    "/users/:id",
    async (
      req: Request<UserParams, FighterUserRow | ErrorResponse>,
      res: Response<FighterUserRow | ErrorResponse>,
    ) => {
      const { id } = req.params;

      try {
        const { data: user, error } = await supabase
          .from("users")
          .select(
            `
            id,
            fname,
            lname,
            profile_picture_url,
            fighters (
              weight_class,
              wins,
              losses,
              draws,
              fight_style,
              height,
              weight
            ),
            user_roles!inner (
              role
            )
          `,
          )
          .eq("id", id)
          .eq("user_roles.role", "fighter")
          .maybeSingle();

        if (error) throw error;

        if (!user) {
          return res.status(404).json({ message: "Fighter not found" });
        }

        return res.status(200).json(user as FighterUserRow);
      } catch (err) {
        console.error("User profile error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  /**
   * GET /users/:id/last-message
   */
  router.get(
    "/users/:id/last-message",
    async (
      req: Request<UserParams, LastMessageResponse | ErrorResponse>,
      res: Response<LastMessageResponse | ErrorResponse>,
    ) => {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { data, error } = await supabase
          .from("messages")
          .select("message, timestamp")
          .or(
            `and(sender_id.eq.${currentUserId},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${currentUserId})`,
          )
          .order("timestamp", { ascending: false })
          .limit(1);

        if (error) throw error;

        const rows = (data ?? []) as LastMessageRow[];

        return res.status(200).json({
          last_message: rows[0]?.message ?? null,
          timestamp: rows[0]?.timestamp ?? null,
        });
      } catch (err) {
        console.error("Last message error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  router.put(
    "/users/role",
    async (
      req: Request<unknown, SetRoleResponse | ErrorResponse, SetRoleBody>,
      res: Response<SetRoleResponse | ErrorResponse>,
    ) => {
      const authUserId = req.user?.id;
      const { role } = req.body;

      if (!authUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (role !== "fighter" && role !== "scout") {
        return res.status(400).json({ message: "Invalid role" });
      }

      try {
        const { data: existingRole, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authUserId)
          .maybeSingle();

        if (roleError) throw roleError;

        if (existingRole) {
          return res
            .status(403)
            .json({ message: "Role already set and cannot be changed" });
        }

        const { error: insertRoleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authUserId,
            role,
          });

        if (insertRoleError) throw insertRoleError;

        if (role === "fighter") {
          const { error: fighterError } = await supabase
            .from("fighters")
            .insert({ user_id: authUserId });

          if (fighterError) throw fighterError;
        }

        if (role === "scout") {
          const { error: scoutError } = await supabase
            .from("scouts")
            .insert({ user_id: authUserId });

          if (scoutError) throw scoutError;
        }

        return res.status(200).json({ message: "Role set successfully" });
      } catch (err) {
        console.error("Set role error:", err);
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  return router;
}
