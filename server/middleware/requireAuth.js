import supabase, { supabaseAdmin } from "../config/supabase.js";

export default async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const user = data.user;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, role, scout_onboarded, fighter_onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return res.status(500).json({ message: profileError.message });
  }

  let finalProfile = profile;
  if (!finalProfile) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("users")
      .upsert({ id: user.id, role: null })
      .select("id, role")
      .single();

    if (createError) {
      return res.status(500).json({ message: createError.message });
    }
    finalProfile = created;
  }

  req.user = finalProfile;
  req.accessToken = token;
  req.supabaseUser = user;

  next();
}
