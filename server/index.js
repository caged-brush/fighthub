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
import ffmpeg from "fluent-ffmpeg";
import { ServerClient } from "postmark";
import { createServer } from "http";
import { Server } from "socket.io";
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

app.use(express.json());

const httpServer = new createServer(app);
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

// app.use(
//   cors({
//     origin: [
//       "http://localhost:3000",
//       "http://10.50.107.251:3000",
//       "http://10.50.107.251:8081",
//       "exp://10.50.99.238:8081",
//     ],
//   })
// );

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

const client = new ServerClient(process.env.POSTMARK_TOKEN);

app.post("/mailer", async (req, res) => {
  try {
    const result = await client.sendEmail({
      From: "jibrilahmeds20@mytru.ca",
      To: "jibrilahmeds20@mytru.ca",
      Subject: "Test",
      TextBody: "Hello from Postmark!",
    });

    res.status(200).json({ message: "Email sent successfully", result });
  } catch (error) {
    console.error("Error sending email:", error);
    res
      .status(500)
      .json({ message: "Failed to send email", error: error.message });
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

// app.put("/update-fighter", async (req, res) => {
//   const {
//     userId,
//     dob,
//     weight_class,
//     wins,
//     losses,
//     draws,
//     profile_url,
//     height,
//     weight,
//     fight_style,
//   } = req.body;

//   try {
//     const result = await db.query(
//       "UPDATE users SET weight_class = $1, date_of_birth = $2, wins = $3, losses = $4, draws = $5, profile_picture_url = $6, height = $7, weight = $8, fight_style =$9 WHERE id = $10 RETURNING *",
//       [
//         weight_class,
//         dob,
//         wins,
//         losses,
//         draws,
//         profile_url,
//         height,
//         weight,
//         fight_style,
//         userId,
//       ]
//     );
//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     } else {
//       res.status(200).json({
//         message: "Fighter details updated successfully",
//         users: result.rows[0],
//       });
//       console.log("Fight info: ", req.body);
//     }
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({ message: "Server error" });
//   }
// });

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

// app.put("/change-profile-pic", async (req, res) => {
//   const { profile_url, userId } = req.body;
//   try {
//     const result = await db.query(
//       "UPDATE users SET profile_picture_url=$1 WHERE id=$2 RETURNING *",
//       [profile_url, userId]
//     );
//     if (result.rows.length === 0) {
//       res.status(404).json({
//         message: "User not found",
//       });
//     } else {
//       res.status(200).json({
//         message: "Image changes successfully",
//         users: result.rows[0],
//       });
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });

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
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// Use multer middleware to handle single file upload with field name "profile_picture"
// Backend (change-profile-pic endpoint)
app.put(
  "/change-profile-pic",
  upload.single("profile_picture"),
  async (req, res) => {
    const userId = req.body.userId; // still accessible via req.body with multer
    const profile_url = req.file ? `/uploads/${req.file.filename}` : null;
    // Full URL

    if (!userId || !profile_url) {
      return res
        .status(400)
        .json({ message: "userId and profile_picture are required" });
    }

    try {
      const result = await db.query(
        "UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING *",
        [profile_url, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        message: "Image changed successfully",
        users: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating profile picture:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Backend (fighter-info endpoint)
app.post("/fighter-info", async (req, res) => {
  const { userId } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const profilePictureUrl = user.profile_picture_url
        ? `http://10.50.107.251:5001${user.profile_picture_url}`
        : null; // Full URL

      const fighterInfo = {
        fname: user.first_name,
        lname: user.last_name,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        fight_style: user.fight_style,
        weight: user.weight,
        height: user.height,
        profile_picture_url: profilePictureUrl,
      };

      res.status(200).json(fighterInfo);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching fighter info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/post", upload.single("media"), async (req, res) => {
  const { user_id, caption } = req.body;
  console.log(req.body, req.file);

  if (!req.file) {
    return res.status(400).json({ error: "No media uploaded" });
  }

  const fileType = req.file.mimetype.split("/")[0];
  const inputPath = req.file.path;

  // If it's a video, process with FFmpeg
  if (fileType === "video") {
    const outputFilename = `${Date.now()}.mp4`;
    const outputPath = path.join(uploadDir, outputFilename);

    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .on("end", async () => {
        console.log("Video conversion complete:", outputPath);

        // Delete the original video file after conversion
        fs.unlinkSync(inputPath);

        try {
          const result = await db.query(
            "INSERT INTO posts (user_id, media_url, caption) VALUES ($1, $2, $3) RETURNING *",
            [user_id, `/uploads/${outputFilename}`, caption]
          );
          res.status(200).json(result.rows[0]);
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Database error" });
        }
      })
      .on("error", (error) => {
        console.error("FFmpeg error:", error);
        res.status(500).json({ error: "Video processing failed" });
      })
      .run();
  }

  // If it's an image, no conversion needed — store directly
  else if (fileType === "image") {
    try {
      const result = await db.query(
        "INSERT INTO posts (user_id, media_url, caption) VALUES ($1, $2, $3) RETURNING *",
        [user_id, `/uploads/${req.file.filename}`, caption]
      );
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Database error" });
    }
  }

  // If unsupported type
  else {
    // Delete the file
    fs.unlinkSync(inputPath);
    return res.status(400).json({ error: "Unsupported media type" });
  }
});

app.post("/follow", async (req, res) => {
  const { followerId, followingId } = req.body;
  console.log("Follower ID:", followerId, "Following ID:", followingId);

  try {
    const existingFollow = await db.query(
      "SELECT * FROM followers WHERE follower_id=$1 AND following_id=$2",
      [followerId, followingId]
    );

    if (existingFollow.rows.length > 0) {
      return res.status(200).json({ message: "Already following" });
    }

    await db.query(
      "INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)",
      [followerId, followingId]
    );
    return res.status(200).json({ message: "Followed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Check if a user is following another user
app.post("/is-following", async (req, res) => {
  const { followerId, followingId } = req.body;
  try {
    const result = await db.query(
      "SELECT 1 FROM followers WHERE follower_id=$1 AND following_id=$2",
      [followerId, followingId]
    );
    if (result.rows.length > 0) {
      return res.status(200).json({ isFollowing: true });
    } else {
      return res.status(200).json({ isFollowing: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to get follower count for a user
app.post("/follower-count", async (req, res) => {
  const { userId } = req.body;
  try {
    const result = await db.query(
      "SELECT COUNT(*) FROM followers WHERE following_id = $1",
      [userId]
    );
    const count = parseInt(result.rows[0].count, 10);
    res.status(200).json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to get following count for a user
app.post("/following-count", async (req, res) => {
  const { userId } = req.body;
  try {
    const result = await db.query(
      "SELECT COUNT(*) FROM followers WHERE follower_id = $1",
      [userId]
    );
    const count = parseInt(result.rows[0].count, 10);
    res.status(200).json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/follower-list", async (req, res) => {
  const { userId } = req.body;
  try {
    const result = await db.query(
      "SELECT u.id, u.fname, u.lname, u.profile_picture_url FROM followers f JOIN users u ON f.follower_id = u.id WHERE f.following_id = $1",
      [userId]
    );
    const followers = result.rows.map((row) => ({
      id: row.id,
      fname: row.fname,
      lname: row.lname,
      profile_picture_url: row.profile_picture_url
        ? `http://10.50.107.1:3000/${row.profile_picture_url}`
        : null,
    }));
    res.status(200).json({ followers });
  } catch (error) {
    console.error("Error fetching follower list:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/unfollow", async (req, res) => {
  const { followerId, followingId } = req.body;
  console.log("Follower ID:", followerId, "Following ID:", followingId);

  try {
    await db.query(
      "DELETE FROM followers WHERE follower_id=$1 AND following_id=$2",
      [followerId, followingId]
    );
    res.status(200).json({ message: "Unfollowed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/like", async (req, res) => {
  const { userId, postId } = req.body;
  //console.log(userId, postId);

  try {
    const existingResult = await db.query(
      "SELECT * from likes WHERE user_id=$1 and post_id=$2",
      [userId, postId]
    );
    if (existingResult.rows.length > 0) {
      return res.status(200).json({ message: "Post already liked" });
    }

    await db.query("INSERT into likes (user_id,post_id) VALUES ($1,$2)", [
      userId,
      postId,
    ]);
    return res.status(200).json({ message: "Post liked successfully" });
  } catch (error) {
    console.error(error);
  }
});

app.post("/unlike", async (req, res) => {
  const { userId, postId } = req.body;
  console.log("userID:", userId, "postId:", postId);

  try {
    const check = await db.query(
      "DELETE FROM likes WHERE user_id=$1 AND post_id=$2 RETURNING *",
      [userId, postId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "No post to unlike" });
    }
    return res.status(200).json({ message: "Post unliked successfully" });
  } catch (error) {
    console.error(error);
  }
});

app.post("/like-count", async (req, res) => {
  const { postId } = req.body;
  console.log(postId);

  try {
    const result = await db.query(
      "SELECT COUNT(*) FROM likes WHERE post_id=$1",
      [postId]
    );

    const likeCount = parseInt(result.rows[0].count, 10);
    return res.status(200).json({ likes: likeCount });
  } catch (error) {
    console.log(error);
  }
});

app.post("/like-counts", async (req, res) => {
  const { postIds } = req.body; // expects an array of post IDs
  console.log("Batch postIds:", postIds);

  if (!Array.isArray(postIds) || postIds.length === 0) {
    return res.status(400).json({ error: "postIds must be a non-empty array" });
  }

  try {
    const result = await db.query(
      `SELECT post_id, COUNT(*) AS count
       FROM likes
       WHERE post_id = ANY($1)
       GROUP BY post_id`,
      [postIds]
    );

    // Initialize counts to 0 for all requested postIds
    const counts = {};
    postIds.forEach((id) => {
      counts[id] = 0;
    });

    // Fill counts from query result
    result.rows.forEach((row) => {
      counts[row.post_id] = parseInt(row.count, 10);
    });

    return res.status(200).json(counts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/liked-posts", async (req, res) => {
  const { userId } = req.body;

  try {
    const result = await db.query(
      "SELECT post_id FROM likes WHERE user_id = $1",
      [userId]
    );

    const likedPostIds = result.rows.map((row) => row.post_id);
    res.json({ likedPostIds });
  } catch (error) {
    console.error("Error fetching liked posts:", error);
    res.status(500).json({ message: "Server error" });
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

app.get("/posts/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await db.query("SELECT * FROM posts WHERE user_id = $1", [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching posts for user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// app.post("resetPassword", passwordReset, (req, res) => {});
// app.listen(port, (req, res) => {
//   console.log(`Server now listening on port ${port}`);
// });

app.get("/users", async (req, res) => {
  const { exclude } = req.query; // e.g., ?exclude=user1

  try {
    const query = exclude
      ? `
        SELECT 
          u.id, 
          u.fname, 
          u.profile_picture_url,
          (
            SELECT m.message
            FROM messages m
            WHERE 
              (m.sender_id = u.id AND m.recipient_id = $1)
              OR (m.sender_id = $1 AND m.recipient_id = u.id)
            ORDER BY m.timestamp DESC
            LIMIT 1
          ) AS last_message
        FROM users u
        WHERE u.id != $1
      `
      : `
        SELECT 
          u.id, 
          u.fname, 
          u.profile_picture_url,
          NULL AS last_message
        FROM users u
      `;

    const values = exclude ? [exclude] : [];

    const { rows } = await db.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users with last message:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const users = new Map();

io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);

  socket.on("join", async (userId) => {
    if (!users.has(userId)) {
      users.set(userId, new Set());
    }
    users.get(userId).add(socket.id);
    console.log(`User ${userId} registered with socket id ${socket.id}`);

    // Fetch users from the database
    try {
      const result = await db.query("SELECT * FROM users");
      const userList = result.rows.map((user) => ({
        id: user.id,
        name: user.fname + " " + user.lname,
      }));

      io.emit(
        "users",
        userList.filter((user) => user.id !== userId)
      );
    } catch (error) {
      console.error("Error fetching users from database:", error);
    }
  });

  socket.on("load-messages", async ({ userId, recipientId }) => {
    try {
      const result = await db.query(
        `SELECT * FROM messages WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id =$1) ORDER BY timestamp ASC`,
        [userId, recipientId]
      );
      io.to(socket.id).emit("message-history", result.rows);
    } catch (err) {
      console.error("Error loading messaging history:", err);
    }
  });

  socket.on("private-message", async ({ recipientId, message, senderId }) => {
    let savedMessage;
    try {
      const result = await db.query(
        "INSERT INTO messages (sender_id,recipient_id,message) VALUES ($1,$2,$3) RETURNING id, message, sender_id, timestamp",
        [senderId, recipientId, message]
      );
      savedMessage = result.rows[0]; // Correctly assign the first row of the result
    } catch (err) {
      console.error("Error saving message to DB:", err);
      return; // Exit if there's an error
    }

    const payload = {
      id: savedMessage.id,
      message: savedMessage.message,
      senderId: savedMessage.sender_id, // Ensure you use the correct property name
      timestamp: savedMessage.timestamp,
    };

    const recipientSockets = users.get(recipientId);
    if (recipientSockets) {
      for (const socketId of recipientSockets) {
        io.to(socketId).emit("private-message", payload);
      }
    }
  });

  // const senderSockets = users.get(senderId);
  // if (senderSockets) {
  //   for (const socketId of senderSockets) {
  //     io.to(socketId).emit("private-message", payload);
  //   }
  // }

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
    for (const [userId, socketSet] of users.entries()) {
      socketSet.delete(socket.id);
      if (socketSet.size === 0) {
        users.delete(userId);
      }
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Server now listening on port ${port}`);
});
