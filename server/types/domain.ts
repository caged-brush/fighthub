export type UserRole = "fighter" | "scout";

export interface AuthUser {
  id: string;
  email?: string | null;
  role?: UserRole;
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
