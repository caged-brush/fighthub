import express, { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import requireAuth from "../middleware/requireAuth.js";
import type { UserRole } from "../types/domain.js";

const router = express.Router();

interface RegisterBody {
  email?: string;
  password?: string;
  role?: UserRole;
}

interface MessageResponse {
  message: string;
}

interface MeResponse {
  id: string;
  role: UserRole;
  fighter_onboarded?: boolean;
  scout_onboarded?: boolean;
  coach_onboarded?: boolean;
}

interface ErrorResponse {
  message: string;
}

const VALID_ROLES: UserRole[] = ["fighter", "scout", "coach"];

router.post(
  "/register",
  async (
    req: Request<unknown, MessageResponse | ErrorResponse, RegisterBody>,
    res: Response<MessageResponse | ErrorResponse>,
  ) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data, error } = await supabaseAdmin.auth.signUp({
      email: normalizedEmail,
      password: String(password),
      options: {
        emailRedirectTo: process.env.EMAIL_CONFIRM_REDIRECT || undefined,
      },
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const userId = data.user?.id;

    if (!userId) {
      return res.status(500).json({ message: "Failed to create auth user" });
    }

    const { error: userUpsertError } = await supabaseAdmin
      .from("users")
      .upsert({
        id: userId,
        role,
      });

    if (userUpsertError) {
      return res.status(500).json({ message: userUpsertError.message });
    }

    if (role === "fighter") {
      const { error: fighterError } = await supabaseAdmin
        .from("fighters")
        .upsert({ user_id: userId });

      if (fighterError) {
        return res.status(500).json({ message: fighterError.message });
      }
    }

    if (role === "scout") {
      const { error: scoutError } = await supabaseAdmin
        .from("scouts")
        .upsert({ user_id: userId });

      if (scoutError) {
        return res.status(500).json({ message: scoutError.message });
      }
    }

    if (role === "coach") {
      const { error: coachError } = await supabaseAdmin
        .from("coaches")
        .upsert({ user_id: userId });

      if (coachError) {
        return res.status(500).json({ message: coachError.message });
      }
    }

    return res.status(200).json({
      message: "Account created. Check your email to verify.",
    });
  },
);

router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response<MeResponse | ErrorResponse>) => {
    if (!req.user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    return res.status(200).json({
      id: req.user.id,
      role: req.user.role,
      fighter_onboarded: req.user.fighter_onboarded,
      scout_onboarded: req.user.scout_onboarded,
      coach_onboarded: req.user.coach_onboarded,
    });
  },
);

export default router;
