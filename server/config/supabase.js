import { createClient } from "@supabase/supabase-js";
import env from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
env.config({ path: join(__dirname, "../.env") });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

// Force Node fetch (bypasses duplex issue)
const getNodeFetch = async (...args) => {
  const { default: fetch } = await import("node-fetch");
  return fetch(...args);
};

// Create the public client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    global: { fetch: getNodeFetch },
  }
);

// Create admin client for storage operations
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
        global: { fetch: getNodeFetch }, // 💥 critical line
      }
    )
  : null;

export default supabase;
