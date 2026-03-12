import { supabaseAdmin } from "../config/supabase.js";
const requireAuth = async (req, res, next) => {
    console.log("[AUTH] start", req.method, req.originalUrl);
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
        console.log("[AUTH] no token");
        return res
            .status(401)
            .json({ message: "No token" });
    }
    console.log("[AUTH] token prefix", token.slice(0, 12));
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
        console.log("[AUTH] invalid token RAW", error);
        return res.status(401).json({
            message: "Invalid token",
            code: error?.code ?? null,
            status: error?.status ?? null,
            error: error?.message ?? String(error),
        });
    }
    console.log("[AUTH] user", data.user.id);
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("users")
        .select("id, role, scout_onboarded, fighter_onboarded")
        .eq("id", data.user.id)
        .maybeSingle();
    if (profileError) {
        console.log("[AUTH] profileError RAW", profileError);
        return res.status(500).json({
            message: "Profile lookup failed",
            code: profileError.code ?? null,
            details: profileError.details ?? null,
            hint: profileError.hint ?? null,
            error: profileError.message ?? String(profileError),
        });
    }
    console.log("[AUTH] profile ok", profile?.id, profile?.role);
    req.user = profile ?? null;
    req.accessToken = token;
    req.supabaseUser = data.user;
    next();
};
export default requireAuth;
