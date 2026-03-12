import express, { Request, Response, Router } from "express";
import fs from "fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";

interface ErrorResponse {
  message: string;
}

interface ChangeProfilePicResponse {
  message: string;
  profile_picture_url: string;
}

interface PublicUserProfile {
  id: string;
  fname?: string | null;
  lname?: string | null;
  profile_picture_url?: string | null;
}

interface FighterProfileRow {
  user_id: string;
  weight_class?: string | null;
  date_of_birth?: string | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  fight_style?: string | null;
  weight?: number | null;
  height?: number | null;
  updated_at?: string | Date | null;
  users?: PublicUserProfile | null;
}

interface FighterProfileResponse extends FighterProfileRow {}

interface UpdateFighterBody {
  weight_class?: string;
  dob?: string;
  wins?: number;
  losses?: number;
  draws?: number;
  fight_style?: string;
  weight?: number;
  height?: number;
}

interface UpdateFighterResponse {
  message: string;
  fighter: FighterProfileRow;
}

interface FighterParams {
  userId: string;
}

type UploadMiddleware = {
  single: (fieldName: string) => RequestHandler;
};

export default function profileRoutes(
  supabase: SupabaseClient,
  upload: UploadMiddleware,
  requireAuth: RequestHandler,
): Router {
  const router = express.Router();

  router.put(
    "/change-profile-pic",
    requireAuth,
    upload.single("profile_picture"),
    async (
      req: Request<unknown, ChangeProfilePicResponse | ErrorResponse>,
      res: Response<ChangeProfilePicResponse | ErrorResponse>,
    ) => {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      try {
        const filename = `${userId}-${Date.now()}-${req.file.originalname}`;

        const { data, error } = await supabase.storage
          .from("profiles")
          .upload(filename, fs.createReadStream(req.file.path), {
            contentType: req.file.mimetype,
            upsert: false,
          });

        if (error) throw error;

        fs.unlinkSync(req.file.path);

        const { error: updateError } = await supabase
          .from("users")
          .update({ profile_picture_url: data.path })
          .eq("id", userId);

        if (updateError) throw updateError;

        return res.status(200).json({
          message: "Profile picture updated",
          profile_picture_url: data.path,
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Upload failed" });
      }
    },
  );

  router.get(
    "/fighter/:userId",
    async (
      req: Request<FighterParams, FighterProfileResponse | ErrorResponse>,
      res: Response<FighterProfileResponse | ErrorResponse>,
    ) => {
      const { userId } = req.params;

      try {
        const { data, error } = await supabase
          .from("fighters")
          .select(
            `
          *,
          users (
            id,
            fname,
            lname,
            profile_picture_url
          )
        `,
          )
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error(error);
          return res
            .status(500)
            .json({ message: "Failed to fetch fighter profile" });
        }

        if (!data) {
          return res.status(404).json({ message: "Fighter not found" });
        }

        return res.status(200).json(data as FighterProfileRow);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  router.put(
    "/update-fighter",
    requireAuth,
    async (
      req: Request<
        unknown,
        UpdateFighterResponse | ErrorResponse,
        UpdateFighterBody
      >,
      res: Response<UpdateFighterResponse | ErrorResponse>,
    ) => {
      const userId = req.user?.id;
      const role = req.user?.role;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (role !== "fighter") {
        return res.status(403).json({ message: "Access denied" });
      }

      const {
        weight_class,
        dob,
        wins,
        losses,
        draws,
        fight_style,
        weight,
        height,
      } = req.body;

      try {
        const { data, error } = await supabase
          .from("fighters")
          .upsert(
            {
              user_id: userId,
              weight_class,
              date_of_birth: dob,
              wins,
              losses,
              draws,
              fight_style,
              weight,
              height,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          )
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({
          message: "Fighter profile updated",
          fighter: data as FighterProfileRow,
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Update failed" });
      }
    },
  );

  return router;
}
