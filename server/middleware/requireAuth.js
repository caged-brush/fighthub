import jwt from "jsonwebtoken";
import supabase from "../config/supabase.js";

export default async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.SESSION_SECRET);

    const { data: user, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user; // ← THIS is what your routes depend on
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
