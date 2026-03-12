import type { User } from "@supabase/supabase-js";
import type { AuthUser } from "./domain.js";

declare module "express-serve-static-core" {
  interface Request {
    user: AuthUser | null;
    accessToken?: string;
    supabaseUser?: User;
  }
}

export {};
