import { supabaseAdmin } from "../config/supabaseAdmin.js";
import supabase from "../config/supabase.js";

export default async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token" });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", data.user.id)
    .single();

  req.user = profile;
  req.accessToken = token;
  req.supabaseUser = data.user;

  next();
}
