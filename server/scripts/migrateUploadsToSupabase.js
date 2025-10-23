import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import mime from "mime";
import { fileURLToPath } from "url";
import supabaseDefault, { supabaseAdmin } from "../config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const UPLOADS_DIR = process.argv[2] || path.join(__dirname, "../uploads"); // or pass path as first arg
const DELETE_LOCAL = process.argv.includes("--delete"); // pass --delete to remove local files after upload
const UPDATE_DB = process.argv.includes("--update-db"); // pass --update-db to try updating posts/users rows
const DRY_RUN = process.argv.includes("--dry"); // don't actually upload if --dry

if (!supabaseAdmin) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in server/.env and restart."
  );
  process.exit(1);
}

const imageExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const videoExt = new Set([".mp4", ".mov", ".mkv", ".webm"]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (e.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function chooseBucketByExt(ext) {
  ext = ext.toLowerCase();
  if (imageExt.has(ext)) return "images";
  if (videoExt.has(ext)) return "videos";
  // fallback bucket
  return "media";
}

async function uploadFile(localPath) {
  const basename = path.basename(localPath);
  const ext = path.extname(basename);
  const bucket = chooseBucketByExt(ext);
  const destName = `${Date.now()}-${basename}`; // avoid collisions
  const destPath = destName; // store at bucket root, change if you want folders

  const contentType = mime.getType(ext) || "application/octet-stream";

  if (DRY_RUN) {
    console.log(`[dry] would upload ${localPath} -> ${bucket}/${destPath}`);
    return { bucket, path: destPath };
  }

  const stream = fsSync.createReadStream(localPath);
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(destPath, stream, { contentType, upsert: false });

  if (error) {
    throw error;
  }
  console.log(`uploaded ${localPath} -> ${bucket}/${data.path}`);
  return { bucket, path: data.path };
}

async function updateDbPaths(basename, storagePath) {
  // try updating posts.media_url rows that reference this file basename
  try {
    // match where media_url contains the filename (case-insensitive)
    const { data: posts, error: pErr } = await supabaseDefault
      .from("posts")
      .select("id, media_url")
      .ilike("media_url", `%${basename}%`);

    if (pErr) {
      console.warn("posts lookup error:", pErr);
    } else if (posts?.length) {
      for (const post of posts) {
        const { error: upErr } = await supabaseDefault
          .from("posts")
          .update({ media_url: storagePath })
          .eq("id", post.id);
        if (upErr) console.warn("posts update error:", upErr);
        else console.log(`updated post ${post.id} media_url -> ${storagePath}`);
      }
    }

    // try users.profile_picture_url
    const { data: users, error: uErr } = await supabaseDefault
      .from("users")
      .select("id, profile_picture_url")
      .ilike("profile_picture_url", `%${basename}%`);

    if (uErr) {
      console.warn("users lookup error:", uErr);
    } else if (users?.length) {
      for (const u of users) {
        const { error: upErr } = await supabaseDefault
          .from("users")
          .update({ profile_picture_url: storagePath })
          .eq("id", u.id);
        if (upErr) console.warn("users update error:", upErr);
        else
          console.log(
            `updated user ${u.id} profile_picture_url -> ${storagePath}`
          );
      }
    }
  } catch (err) {
    console.error("DB update error:", err);
  }
}

async function main() {
  try {
    const exists = await fs.stat(UPLOADS_DIR).catch(() => null);
    if (!exists) {
      console.error("Uploads dir not found:", UPLOADS_DIR);
      process.exit(1);
    }

    const files = await walk(UPLOADS_DIR);
    console.log(`Found ${files.length} files in ${UPLOADS_DIR}`);

    for (const file of files) {
      try {
        const basename = path.basename(file);
        const { bucket, path: storagePath } = await uploadFile(file);
        if (UPDATE_DB) {
          await updateDbPaths(basename, storagePath);
        }
        if (DELETE_LOCAL && !DRY_RUN) {
          await fs.unlink(file);
          console.log(`deleted local file ${file}`);
        }
      } catch (err) {
        console.error("Failed for file:", file, err.message || err);
      }
    }

    console.log("Done.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
