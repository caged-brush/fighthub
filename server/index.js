import express, { json } from "express";
import cors from "cors";
import env from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import path from "path";
import bodyParser from "body-parser";
import fs from "fs";
import axios from "axios";
import passport from "passport";
import session from "express-session";
import pg from "pg";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { error, info } from "console";
import multer from "multer";
const port = process.env.PORT || 5001;
const app = express();
const saltRounds = 10;
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

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://10.50.99.238:3000",
      "http://10.50.99.238:8081",
      "exp://10.50.99.238:8081",
    ],
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

function validateUserInput(req, res, next) {
  console.log("Incoming Request Body:", req.body);
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
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a digit, and a special character,Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a digit, and a special character",
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

async function authenticateJWT(req, res, next) {
  const jwtToken = req.header("token");

  if (!jwtToken) {
    return res.status(403).json("Not Authorized");
  }
  try {
    const payload = jwt.verify(jwtToken, process.env.SESSION_SECRET);
    req.user = payload.id;
    next();
  } catch (error) {
    console.error(error.message);
    res.status(403).json("You are not authorized");
  }
}

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

app.post("/register", validateUserInput, async (req, res) => {
  const { fname, lname, email, password } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.json({ message: "Email already in use please login" });
    } else {
      const salt = await bcrypt.genSalt(saltRounds);
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
  }
});

app.post("/login", validateUserInput, async (req, res) => {
  const email = req.body.email;
  const loginPassword = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const userId = user.id;
      const storedHashedPassword = user.password;

      bcrypt.compare(loginPassword, storedHashedPassword, (err, isMatch) => {
        if (err) {
          console.error(err);
          res
            .status(500)
            .json({ sucess: false, error: "Internal server error" });
        } else if (isMatch) {
          console.log("Success");
          const token = createToken(userId);
          res.status(200).json({
            token,
            userId,
          });
        } else {
          console.log("Failure");
          res.json({ sucess: false, error: "Incorrect password" });
        }
      });
    } else {
      res.json({ success: false, error: "Email not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.put("/update-fighter", async (req, res) => {
  const {
    userId,
    dob,
    weight_class,
    wins,
    losses,
    draws,
    profile_url,
    height,
    weight,
    fight_style,
  } = req.body;

  try {
    const result = await db.query(
      "UPDATE users SET weight_class = $1, date_of_birth = $2, wins = $3, losses = $4, draws = $5, profile_picture_url = $6, height = $7, weight = $8, fight_style =$9 WHERE id = $10 RETURNING *",
      [
        weight_class,
        dob,
        wins,
        losses,
        draws,
        profile_url,
        height,
        weight,
        fight_style,
        userId,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    } else {
      res.status(200).json({
        message: "Fighter details updated successfully",
        users: result.rows[0],
      });
      console.log("Fight info: ", req.body);
    }
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
});

app.post("/fighter-info", async (req, res) => {
  const { userId } = req.body;
  try {
    const result = await db.query("SELECT * from users WHERE id=$1", [userId]);
    if (result.rows.length > 0) {
      console.log(result.rows[0]);
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.log(error);
  }
});

app.put("/change-profile-pic", async (req, res) => {
  const { profile_url, userId } = req.body;
  try {
    const result = await db.query(
      "UPDATE users SET profile_picture_url=$1 WHERE id=$2 RETURNING *",
      [profile_url, userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({
        message: "User not found",
      });
    } else {
      res.status(200).json({
        message: "Image changes successfully",
        users: result.rows[0],
      });
    }
  } catch (error) {
    console.log(error);
  }
});

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: "ognjmvnupvwbiljl",
  },
});

app.post("/forgotPassword", async (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000);

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Email not found" });
    }

    await db.query(
      "UPDATE users SET reset_code =$1,code_expires = NOW() + INTERVAL '15 minutes' WHERE email = $2",
      [code, email]
    );

    const mailOptions = {
      from: process.env.EMAIL_PASS,
      to: email,
      subject: "Your Password Reset Code",
      text: `Your password reset code is: ${code}`,
    };
    transport.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Email send error:", error);
        return res.status(500).json({ message: "Failed to send email" });
      }
      console.log("Email sent:", info.response);
      res.status(200).json({ message: "Verification code sent to your email" });
    });
    console.log(`Code send ${code}`);
    //res.status(200).json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.log(error);
  }
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
    cb(null, uploadDir); // Use the absolute path to the 'uploads' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.post("/post", upload.single("media"), async (req, res) => {
  const { user_id, caption } = req.body;
  const media_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!media_url) {
    return res.status(400).json({ error: "No media uploaded" });
  }

  try {
    const result = await db.query(
      "INSERT INTO posts (user_id, media_url, caption) VALUES ($1, $2, $3) RETURNING * ",
      [user_id, media_url, caption]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});
app.use("/uploads", express.static("uploads"));

// Express route for fetching paginated posts
app.get("/posts", async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default to page 1, limit 10
  const offset = (page - 1) * limit; // Calculate the offset for the SQL query

  try {
    const result = await db.query(
      "SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching posts" });
  }
});

// app.post("resetPassword", passwordReset, (req, res) => {});
app.listen(port, (req, res) => {
  console.log(`Server now listening on port ${port}`);
});
