import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

export default function authRoutes(
  db,
  createToken,
  validateUserInput,
  transport
) {
  // Register
  router.post("/register", validateUserInput, async (req, res) => {
    const { fname, lname, email, password } = req.body;
    try {
      const checkResult = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      if (checkResult.rows.length > 0) {
        res.json({ message: "Email already in use please login" });
      } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const result = await db.query(
          "INSERT INTO users (fname,lname,email,password) VALUES ($1,$2,$3,$4) RETURNING *",
          [fname, lname, email, hashedPassword]
        );
        const user = result.rows[0];
        const userId = user.id;
        const token = createToken(userId);
        res.status(200).json({ token, userId });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Login
  router.post("/login", validateUserInput, async (req, res) => {
    const email = req.body.email;
    const loginPassword = req.body.password;
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(loginPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const userId = user.id;
      const token = createToken(userId);
      res.status(200).json({ token, userId });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Forgot Password
  router.post("/forgotPassword", async (req, res) => {
    const { email } = req.body;
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      const resetToken = Math.random().toString(36).substr(2);
      await transport.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset",
        text: `Your password reset token is: ${resetToken}`,
      });
      res.status(200).json({ message: "Password reset email sent" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
