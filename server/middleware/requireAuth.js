import supabase from "../config/supabase.js";

export default async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // ✅ Validate token with Supabase
    const { data: authData, error: authErr } =
      await supabase.auth.getUser(token);

    if (authErr || !authData?.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const userId = authData.user.id;

    // ✅ Pull your app-specific user record (role, etc.)
    const { data: user, error: dbErr } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (dbErr || !user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // routes depend on this
    next();
  } catch (err) {
    console.log("AUTH ERROR:", err?.message || err);
    return res.status(401).json({ message: "Unauthorized" });
  }
}
