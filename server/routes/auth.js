import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

export default function authRoutes(
  supabase,
  createToken,
  validateUserInput,
  transport
) {
  /**
   * POST /register
   * Creates user + assigns role + initializes role table
   */
  // Register
  router.post("/register", validateUserInput, async (req, res) => {
    console.log("/register body:", req.body);

    const { fname, lname, email, password, role } = req.body;

    // ✅ role required
    if (!["fighter", "scout"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    try {
      // 1) Check if user exists
      const { data: existingUser, error: existsError } = await supabase
        .from("users")
        .select("id,email")
        .eq("email", email)
        .maybeSingle();

      if (existsError) {
        console.error("exists check error:", existsError);
        return res.status(500).json({ message: "Database error" });
      }

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Email already in use please login" });
      }

      // 2) Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 3) Insert user
      const { data: newUser, error: userInsertError } = await supabase
        .from("users")
        .insert([{ fname, lname, email, password: hashedPassword, role }]) // ✅ add role
        .select()
        .single();

      if (userInsertError) {
        console.error("user insert error:", userInsertError);
        return res.status(500).json({ message: "Failed to create user" });
      }

      const userId = newUser.id;

      // 4) Insert role into user_roles
      const roleInsert = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role }])
        .select("*")
        .single();

      console.log("ROLE INSERT:", roleInsert.data, roleInsert.error);

      const verify = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId);

      console.log("VERIFY user_roles:", verify.data, verify.error);

      console.log("ROLE INSERT OK:", roleInsert.data);

      console.log("ROLE INSERT RESULT:", roleInsert);

      if (roleInsert.error) {
        console.error("ROLE INSERT ERROR FULL:", roleInsert.error);

        // TEMP: do not delete the user while debugging (keep evidence)
        return res.status(500).json({
          message: "Failed to set role",
          details: roleInsert.error,
        });
      }

      // 5) Create profile row (optional but recommended)
      if (role === "fighter") {
        const { error: fighterError } = await supabase
          .from("fighters")
          .insert([{ user_id: userId }]);

        if (fighterError) {
          console.error("fighter create error:", fighterError);
          // best-effort rollback
          await supabase.from("user_roles").delete().eq("user_id", userId);
          await supabase.from("users").delete().eq("id", userId);
          return res
            .status(500)
            .json({ message: "Failed to create fighter profile" });
        }
      }

      if (role === "scout") {
        const { error: scoutError } = await supabase
          .from("scouts")
          .insert([{ user_id: userId }]);

        if (scoutError) {
          console.error("scout create error:", scoutError);
          // best-effort rollback
          await supabase.from("user_roles").delete().eq("user_id", userId);
          await supabase.from("users").delete().eq("id", userId);
          return res
            .status(500)
            .json({ message: "Failed to create scout profile" });
        }
      }

      // 6) Token
      const token = createToken(userId);
      res.status(200).json({ token, userId, role });
    } catch (err) {
      console.error("register error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * POST /login
   * Authenticates user and returns roles
   */
  router.post("/login", validateUserInput, async (req, res) => {
    const { email, password } = req.body;

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, password")
        .eq("email", email)
        .maybeSingle();

      if (error) throw error;
      if (!user)
        return res.status(401).json({ message: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        return res.status(401).json({ message: "Invalid credentials" });

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      const role = rolesData?.[0]?.role;
      if (!role)
        return res.status(500).json({ message: "Role not found for user" });

      const token = createToken(user.id);

      return res.status(200).json({
        token,
        userId: user.id,
        role,
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  /**
   * POST /forgot-password
   * Sends reset token (hashed in DB)
   */
  router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const resetToken = Math.random().toString(36).slice(2, 10);
      const hashedToken = await bcrypt.hash(resetToken, 10);

      await supabase
        .from("users")
        .update({
          reset_token: hashedToken,
          reset_token_expiry: new Date(
            Date.now() + 60 * 60 * 1000
          ).toISOString(),
        })
        .eq("id", user.id);

      await transport.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset",
        text: `Your password reset code is: ${resetToken}`,
      });

      res.status(200).json({ message: "Reset email sent" });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  /**
   * POST /reset-password
   * Verifies token and updates password
   */
  router.post("/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, reset_token, reset_token_expiry")
        .eq("email", email)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return res.status(400).json({ message: "Invalid request" });
      }

      if (!user.reset_token || new Date(user.reset_token_expiry) < new Date()) {
        return res.status(400).json({ message: "Token expired" });
      }

      const validToken = await bcrypt.compare(token, user.reset_token);
      if (!validToken) {
        return res.status(400).json({ message: "Invalid token" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await supabase
        .from("users")
        .update({
          password: hashedPassword,
          reset_token: null,
          reset_token_expiry: null,
        })
        .eq("id", user.id);

      res.status(200).json({ message: "Password updated" });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
