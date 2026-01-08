import express from "express";
import cors from "cors";
import env from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import path from "path";
import bodyParser from "body-parser";
import fs from "fs";
import passport from "passport";
import nodemailer from "nodemailer";
import multer from "multer";
import { ServerClient } from "postmark";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import supabase from "./config/supabase.js";
import fightersRoute from "./routes/fighter.js";
import mailerRoute from "./routes/mailer.js";
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
env.config();

const app = express();

// ===== CORS CONFIG (no more manual IP switching) =====
const allowedOrigins = [
  "http://localhost:3000", // local web dev
  "http://localhost:19006", // Expo web
  "exp://10.50.107.251:8081", // Expo LAN (for dev only)
  "https://fighthub.onrender.com", // Render backend
  "https://yourfrontenddomain.com", // placeholder for deployed frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow mobile or postman
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ===== PATH SETUP =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== JWT UTILITY =====
const createToken = (id) => {
  return jwt.sign({ id }, process.env.SESSION_SECRET, { expiresIn: "3d" });
};

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());

// ===== EMAIL SETUP =====
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
      pwd
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
app.use(mailerRoute(client));
app.use(postsRoute(supabase, upload, uploadDir));
app.use(followersRoute(supabase));
app.use(likesRoute(supabase));
app.use(usersRoute(supabase));
app.use(authRoutes(supabase, createToken, validateUserInput, transport));
app.use(profileRoutes(supabase, upload, requireAuth));
app.use("/fighters", fightersRoute(supabase, requireAuth));
app.use("/scouts", scoutsRoutes(supabase, requireAuth));
app.use("/scouts", scoutWatchlistRoutes(supabase, requireAuth));

// ===== STATIC FILES =====
app.use("/uploads", express.static(uploadDir));

// ===== SOCKET.IO SETUP =====
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
});

// ✅ pass db
setupSocket(io, db);

// ===== HEALTH CHECK =====
app.get("/", (req, res) => res.send("FightHub backend is running ✅"));

// ===== SERVER START =====
const port = process.env.PORT || 5001;
httpServer.listen(port, () => {
  console.log(`🔥 Server live on port ${port}`);
});
