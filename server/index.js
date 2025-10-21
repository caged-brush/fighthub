import express from "express";
import cors from "cors";
import env from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import path from "path";
import bodyParser from "body-parser";
import fs from "fs";
import passport from "passport";
import session from "express-session";
import pg from "pg";
import nodemailer from "nodemailer";
import multer from "multer";
import { ServerClient } from "postmark";
import { createServer } from "http";
import { Server } from "socket.io";
import mailerRoute from "./routes/mailer.js";
import postsRoute from "./routes/posts.js";
import followersRoute from "./routes/followers.js";
import likesRoute from "./routes/likes.js";
import usersRoute from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import setupSocket from "./socket.js";

const port = process.env.PORT || 5001;
const app = express();

const createToken = (id) => {
  return jwt.sign({ id }, process.env.SESSION_SECRET, { expiresIn: "3d" });
};

env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "exp://10.50.107.251:3000",
      "exp://10.50.107.251:8081",
      "exp://10.50.107.251:8081",
    ],
    methods: ["GET", "POST"],
  },
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

function validateUserInput(req, res, next) {
  const { fname, lname, email, password, confirm } = req.body;

  function validEmail(userEmail) {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userEmail);
  }

  function validPassword(userPassword) {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(userPassword);
  }

  if (req.path === "/register") {
    if (![fname, lname, email, password, confirm].every(Boolean)) {
      return res.status(401).json({ error: "Missing Credentials" });
    } else if (!validEmail(email)) {
      return res.status(401).json({ error: "Invalid Email" });
    } else if (!validPassword(password)) {
      return res.status(401).json({
        error:
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a digit, and a special character",
      });
    } else if (password !== confirm) {
      return res.status(401).json({ error: "Passwords do not match" });
    }
  } else if (req.path === "/login") {
    if (![email, password].every(Boolean)) {
      return res.status(401).json({ error: "Missing Credentials" });
    } else if (!validEmail(email)) {
      return res.status(401).json({ error: "Invalid Email" });
    }
  }
  next();
}

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

db.connect();

const client = new ServerClient(process.env.POSTMARK_TOKEN);

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const uploadDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "uploads"
);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.use(mailerRoute(client));
app.use(postsRoute(db, upload, uploadDir));
app.use(followersRoute(db));
app.use(likesRoute(db));
app.use(usersRoute(db));
app.use(authRoutes(db, createToken, validateUserInput, transport));
app.use(profileRoutes(db, upload));

// Static files
app.use("/uploads", express.static("uploads"));

// Modularized socket.io logic
setupSocket(io, db);

httpServer.listen(port, () => {
  console.log(`Server now listening on port ${port}`);
});
