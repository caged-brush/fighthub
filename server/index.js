import express from "express";
import cors from "cors";
import env from "dotenv";
import cookieParser from "cookie-parser";

import path from "path";
import fs from "fs";
import passport from "passport";
import multer from "multer";
import authProfileRoutes from "./routes/authProfile.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import fightersRoute from "./routes/fighter.js";
import bookingRoutes from "./routes/booking.js";
import postsRoute from "./routes/posts.js";
import followersRoute from "./routes/followers.js";
import likesRoute from "./routes/likes.js";
import usersRoute from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import setupSocket from "./socket.js";
import requireAuth from "./middleware/requireAuth.js";
import scoutsRoutes from "./routes/scout.js";
import scoutWatchlistRoutes from "./routes/scoutWatchlistRoutes.js";
import inboxRoutes from "./routes/inbox.js";
import fightClipsRoutes from "./routes/fightClipsRoutes.js";
import supabase, { supabaseAdmin } from "./config/supabase.js";
env.config();

const app = express();
app.get("/debug/whoami", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ ok: false, error: "no token" });

  const { data, error } = await supabase.auth.getUser(token);

  return res.json({
    ok: !!data?.user && !error,
    error: error?.message || null,
    userId: data?.user?.id || null,
    email: data?.user?.email || null,
    supabaseUrl: process.env.SUPABASE_URL,
  });
});

// ===== CORS CONFIG (no more manual IP switching) =====
const allowedOrigins = [
  "http://localhost:3000", // local web dev
  "http://localhost:19006", // Expo web
  "exp://10.50.107.251:8081", // Expo LAN (for dev only)
  "https://fighthub.onrender.com", // Render backend
  "https://yourfrontenddomain.com", // placeholder for deployed frontend
];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true); // allow mobile or postman
//       if (allowedOrigins.includes(origin)) return callback(null, true);
//       return callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );

// ===== PATH SETUP =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== JWT UTILITY =====

// ===== MIDDLEWARE =====

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

app.use(cookieParser());
app.use(passport.initialize());

app.use((req, res, next) => {
  console.log("➡️", req.method, req.originalUrl);
  next();
});

// ===== EMAIL SETUP =====

// ===== FILE UPLOAD SETUP =====
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ===== VALIDATION MIDDLEWARE =====
function validateUserInput(req, res, next) {
  const { fname, lname, email, password, confirm } = req.body;

  const validEmail = (email) =>
    /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
  const validPassword = (pwd) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
      pwd,
    );

  if (req.path === "/register") {
    if (![fname, lname, email, password, confirm].every(Boolean))
      return res.status(401).json({ error: "Missing credentials" });
    if (!validEmail(email))
      return res.status(401).json({ error: "Invalid email" });
    if (!validPassword(password))
      return res.status(401).json({
        error:
          "Password must be at least 8 characters long and include uppercase, lowercase, digit, and special char",
      });
    if (password !== confirm)
      return res.status(401).json({ error: "Passwords do not match" });
  } else if (req.path === "/login") {
    if (![email, password].every(Boolean))
      return res.status(401).json({ error: "Missing credentials" });
    if (!validEmail(email))
      return res.status(401).json({ error: "Invalid email" });
  }

  next();
}

// ===== ROUTES =====

app.use(postsRoute(supabase, upload, uploadDir));
app.use(followersRoute(supabase));
app.use(likesRoute(supabase));
app.use(usersRoute(supabase));
//app.use(authRoutes(supabase, createToken, validateUserInput));
app.use(profileRoutes(supabase, upload, requireAuth));
app.use("/fighters", fightersRoute(supabase, requireAuth));
app.use("/scouts", scoutsRoutes(supabase, requireAuth));
app.use("/scouts", scoutWatchlistRoutes(supabase, requireAuth));
app.use("/inbox", inboxRoutes(supabase, requireAuth));
app.use("/fight-clips", fightClipsRoutes(supabase, supabaseAdmin, requireAuth));
app.use("/booking", bookingRoutes);
app.use("/auth", authProfileRoutes);

// ===== STATIC FILES =====
app.use("/uploads", express.static(uploadDir));

console.log("SUPABASE ENV:", {
  url: process.env.SUPABASE_URL,
  anonPrefix: (process.env.SUPABASE_ANON_KEY || "").slice(0, 10),
});

// ===== SOCKET.IO SETUP =====
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
});

setupSocket(io, supabase);

// ===== HEALTH CHECK =====
app.get("/", (req, res) => res.send("FightHub backend is running ✅"));

// ===== SERVER START =====
const port = process.env.PORT || 5001;
httpServer.listen(port, () => {
  console.log(`🔥 Server live on port ${port}`);
});
