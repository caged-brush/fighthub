import { createClient } from "@supabase/supabase-js";
export function supabaseAsUser(accessToken) {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    }
    if (!accessToken) {
        throw new Error("Missing access token for supabaseAsUser");
    }
    return createClient(url, anonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}
