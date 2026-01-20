import jwt from "jsonwebtoken";
import supabase from "../config/supabase.js";

export default async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.SESSION_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", decoded.id)
      .single();

    if (error || !user)
      return res.status(401).json({ message: "Invalid token" });

    req.user = user;
    next();
  } catch (err) {
    console.log("AUTH FAIL:", err?.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
}
