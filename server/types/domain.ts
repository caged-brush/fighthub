export interface AuthUser {
  id: string;
  role: UserRole;
  fighter_onboarded?: boolean;
  scout_onboarded?: boolean;
  coach_onboarded?: boolean;
}

export interface Profile {
  id: string;
  email: string | null;
  role: UserRole;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
}

export type UserRole = "fighter" | "scout" | "coach";
