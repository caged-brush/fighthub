import express from "express";
import cors from "cors";
import env from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import passport from "passport";
import nodemailer from "nodemailer";
import multer from "multer";
import { ServerClient } from "postmark";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import supabase from "./config/supabase.js";
import mailerRoute from "./routes/mailer.js";
import postsRoute from "./routes/posts.js";
import followersRoute from "./routes/followers.js";
import likesRoute from "./routes/likes.js";
import usersRoute from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import setupSocket from "./socket.js";

// Load environment variables
env.config();

// Express setup
const app = express();
const httpServer = createServer(app);

// Proper __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== CORS SETUP ======
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://fighthub.onrender.com",
      "exp://10.50.107.251:3000",
      "exp://10.50.107.251:8081",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ====== UTILITIES ======
const createToken = (id) => {
  return jwt.sign({ id }, process.env.SESSION_SECRET, { expiresIn: "3d" });
};

// ====== MIDDLEWARE ======
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());

// ====== SOCKET.IO ======
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://fighthub.onrender.com",
      "exp://10.50.107.251:3000",
      "exp://10.50.107.251:8081",
    ],
    methods: ["GET", "POST"],
  },
});
setupSocket(io);

// ====== INPUT VALIDATION ======
function validateUserInput(req, res, next) {
  const { fname, lname, email, password, confirm } = req.body;

  const validEmail = (email) =>
    /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
  const validPassword = (pwd) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
      pwd
    );

  if (req.path === "/register") {
    if (![fname, lname, email, password, confirm].every(Boolean))
      return res.status(401).json({ error: "Missing Credentials" });
    if (!validEmail(email))
      return res.status(401).json({ error: "Invalid Email" });
    if (!validPassword(password))
      return res.status(401).json({
        error:
          "Password must be 8+ chars and include uppercase, lowercase, number, special char",
      });
    if (password !== confirm)
      return res.status(401).json({ error: "Passwords do not match" });
  } else if (req.path === "/login") {
    if (![email, password].every(Boolean))
      return res.status(401).json({ error: "Missing Credentials" });
    if (!validEmail(email))
      return res.status(401).json({ error: "Invalid Email" });
  }
  next();
}

// ====== FILE UPLOAD SETUP ======
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ====== EMAIL SETUP ======
const client = new ServerClient(process.env.POSTMARK_TOKEN);
const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ====== ROUTES ======
app.use(mailerRoute(client));
app.use(postsRoute(supabase, upload, uploadDir));
app.use(followersRoute(supabase));
app.use(likesRoute(supabase));
app.use(usersRoute(supabase));
app.use(authRoutes(supabase, createToken, validateUserInput, transport));
app.use(profileRoutes(supabase, upload));

// ====== STATIC FILES ======
app.use("/uploads", express.static("uploads"));

// ====== DEFAULT ROUTE ======
app.get("/", (req, res) => {
  res.send("FightHub backend is running ✅");
});

// ====== START SERVER ======
const port = process.env.PORT || 5001;
httpServer.listen(port, () => {
  console.log(`✅ Server is live on port ${port}`);
});
