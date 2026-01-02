import express from "express";
const router = express.Router();

export default function usersRoute(supabase) {
  /**
   * GET /users
   * Returns fighter profiles only (for scouting / discovery)
   * Optional: exclude current user
   */
  router.get("/users", async (req, res) => {
    const { exclude } = req.query;

    try {
      let query = supabase
        .from("users")
        .select(
          `
          id,
          fname,
          profile_picture_url,
          fighters (
            weight_class,
            wins,
            losses,
            draws,
            height,
            weight
          ),
          user_roles!inner (
            role
          )
        `
        )
        .eq("user_roles.role", "fighter");

      if (exclude) {
        query = query.neq("id", exclude);
      }

      const { data: users, error } = await query;
      if (error) throw error;

      const processedUsers = users.map((user) => ({
        id: user.id,
        fname: user.fname,
        profile_picture_url: user.profile_picture_url,
        fighter: user.fighters,
      }));

      // Signed profile images (optional but correct)
      if (global.supabaseAdmin) {
        await Promise.all(
          processedUsers.map(async (user) => {
            if (!user.profile_picture_url) return;

            const { data } = await global.supabaseAdmin.storage
              .from("profiles")
              .createSignedUrl(user.profile_picture_url, 3600);

            if (data?.signedUrl) {
              user.profile_signed_url = data.signedUrl;
            }
          })
        );
      }

      res.status(200).json(processedUsers);
    } catch (err) {
      console.error("Users fetch error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /users/:id
   * Public fighter profile (scouts can view, cannot edit)
   */
  router.get("/users/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select(
          `
          id,
          fname,
          lname,
          profile_picture_url,
          fighters (
            weight_class,
            wins,
            losses,
            draws,
            fight_style,
            height,
            weight
          ),
          user_roles!inner (
            role
          )
        `
        )
        .eq("id", id)
        .eq("user_roles.role", "fighter")
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return res.status(404).json({ message: "Fighter not found" });
      }

      res.status(200).json(user);
    } catch (err) {
      console.error("User profile error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /users/:id/last-message
   * Lightweight last-message fetch (no massive joins)
   */
  router.get("/users/:id/last-message", async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("message, timestamp")
        .or(
          `and(sender_id.eq.${currentUserId},recipient_id.eq.${id}),
           and(sender_id.eq.${id},recipient_id.eq.${currentUserId})`
        )
        .order("timestamp", { ascending: false })
        .limit(1);

      if (error) throw error;

      res.status(200).json({
        last_message: data?.[0]?.message || null,
        timestamp: data?.[0]?.timestamp || null,
      });
    } catch (err) {
      console.error("Last message error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/users/role", async (req, res) => {
    const authUserId = req.user?.id;
    const { role } = req.body;

    if (!authUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["fighter", "scout"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    try {
      // 1️⃣ Check if role already exists
      const { data: existingRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (roleError) throw roleError;

      if (existingRole) {
        return res
          .status(403)
          .json({ message: "Role already set and cannot be changed" });
      }

      // 2️⃣ Insert role
      const { error: insertRoleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authUserId,
          role,
        });

      if (insertRoleError) throw insertRoleError;

      // 3️⃣ Create role-specific profile
      if (role === "fighter") {
        const { error: fighterError } = await supabase
          .from("fighters")
          .insert({ user_id: authUserId });

        if (fighterError) throw fighterError;
      }

      if (role === "scout") {
        const { error: scoutError } = await supabase
          .from("scouts")
          .insert({ user_id: authUserId });

        if (scoutError) throw scoutError;
      }

      res.status(200).json({ message: "Role set successfully" });
    } catch (err) {
      console.error("Set role error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
