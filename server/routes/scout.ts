import express, { Request, Response, Router, RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ErrorResponse {
  message: string;
}

interface ScoutUserInfo {
  fname?: string | null;
  lname?: string | null;
  profile_picture_url?: string | null;
  region?: string | null;
}

interface ScoutRow {
  user_id: string;
  organization?: string | null;
  region?: string | null;
  users?: ScoutUserInfo | ScoutUserInfo[] | null;
}

interface ScoutUpdateBody {
  organization?: string;
  region?: string;
  date_of_birth?: string;
}

interface ScoutUpdateResponse {
  message: string;
  scout: ScoutRow;
  scout_onboarded: true;
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

export default function scoutsRoutes(
  supabase: SupabaseClient,
  requireAuth: RequestHandler,
): Router {
  const router = express.Router();

  router.get(
    "/me",
    requireAuth,
    async (req: Request, res: Response<ScoutRow | ErrorResponse>) => {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { data, error } = await supabase
          .from("scouts")
          .select(
            `
            user_id,
            organization,
            region,
            users (
              fname,
              lname,
              profile_picture_url,
              region
            )
          `,
          )
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("GET /scouts/me supabase error:", error);
          return res.status(500).json({ message: "Server error" });
        }

        if (!data) {
          return res.status(404).json({ message: "Scout profile not found" });
        }

        return res.json(data as ScoutRow);
      } catch (err) {
        console.error("GET /scouts/me crash:", getErrorMessage(err));
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  router.put(
    "/me",
    requireAuth,
    async (
      req: Request<
        unknown,
        ScoutUpdateResponse | ErrorResponse,
        ScoutUpdateBody
      >,
      res: Response<ScoutUpdateResponse | ErrorResponse>,
    ) => {
      const userId = req.user?.id;
      const role = req.user?.role;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (role !== "scout") {
        return res.status(403).json({ message: "Only scouts allowed" });
      }

      const { organization, region, date_of_birth } = req.body;

      if (!date_of_birth || !organization || !region) {
        return res.status(400).json({
          message: "date_of_birth, organization, and region are required",
        });
      }

      try {
        const { error: usersErr } = await supabase
          .from("users")
          .update({
            date_of_birth,
            region,
            scout_onboarded: true,
          })
          .eq("id", userId);

        if (usersErr) {
          throw usersErr;
        }

        const { data: scout, error: scoutErr } = await supabase
          .from("scouts")
          .upsert(
            { user_id: userId, organization, region },
            { onConflict: "user_id" },
          )
          .select()
          .single();

        if (scoutErr) {
          throw scoutErr;
        }

        return res.json({
          message: "Scout profile saved",
          scout: scout as ScoutRow,
          scout_onboarded: true,
        });
      } catch (err) {
        console.error("PUT /scouts/me error:", getErrorMessage(err));
        return res
          .status(500)
          .json({ message: "Failed to update scout profile" });
      }
    },
  );

  return router;
}
