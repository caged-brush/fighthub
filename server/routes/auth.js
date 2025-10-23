import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

export default function authRoutes(
  supabase,
  createToken,
  validateUserInput,
  transport
) {
  // Register
  router.post("/register", validateUserInput, async (req, res) => {
    console.log("/register body:", req.body); // debug
    const { fname, lname, email, password } = req.body;
    try {
      // Check if user exists (use maybeSingle so no error when not found)
      const { data: existingUser, error: existsError } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (existsError) {
        console.error("supabase exists check error:", existsError);
        return res.status(500).json({ message: "Database error" });
      }

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Email already in use please login" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert new user
      const { data: newUser, error } = await supabase
        .from("users")
        .insert([
          {
            fname,
            lname,
            email,
            password: hashedPassword,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("supabase insert error:", error);
        throw error;
      }

      const userId = newUser.id;
      const token = createToken(userId);
      res.status(200).json({ token, userId });
    } catch (err) {
      console.error("register error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Login
  router.post("/login", validateUserInput, async (req, res) => {
    const { email, password: loginPassword } = req.body;
    try {
      // Get user by email (maybeSingle)
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("supabase login select error:", error);
        return res.status(500).json({ message: "Server error" });
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(loginPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const userId = user.id;
      const token = createToken(userId);
      res.status(200).json({ token, userId });
    } catch (error) {
      console.error("login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Forgot Password
  router.post("/forgotPassword", async (req, res) => {
    const { email } = req.body;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("forgotPassword select error:", error);
        return res.status(500).json({ message: "Server error" });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const resetToken = Math.random().toString(36).substr(2, 8);
      const { error: updateError } = await supabase
        .from("users")
        .update({
          reset_token: resetToken,
          reset_expires: new Date(Date.now() + 3600_000).toISOString(),
        })
        .eq("email", email);

      if (updateError) {
        console.error("forgotPassword update error:", updateError);
        throw updateError;
      }

      await transport.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset",
        text: `Your password reset token is: ${resetToken}`,
      });

      res.status(200).json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("forgotPassword error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
