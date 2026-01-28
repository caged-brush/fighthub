import jwt from "jsonwebtoken";
import supabase from "../config/supabase.js";

export default async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!token) return res.status(401).json({ message: "No token provided" });

    const secret = (process.env.JWT_SECRET || "").trim();
    if (!secret) {
      console.log("AUTH FAIL: missing JWT_SECRET at runtime");
      return res.status(500).json({ message: "Server misconfigured" });
    }

    const decoded = jwt.verify(token, secret);

    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    return next();
  } catch (err) {
    console.log("AUTH FAIL:", err?.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
}
