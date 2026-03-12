import express, { Request, Response, Router, RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ErrorResponse {
  message: string;
}

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  timestamp: string | null;
}

interface UserRow {
  id: string;
  fname?: string | null;
  lname?: string | null;
  role?: string | null;
  profile_picture_url?: string | null;
}

interface ConversationItem {
  userId: string;
  name: string;
  role: string | null;
  profile_picture_url: string | null;
  lastMessage: string;
  lastTimestamp: string | null;
}

interface InboxResponse {
  conversations: ConversationItem[];
}

function getErrorMessage(
  error: unknown,
  fallback = "Failed to load inbox",
): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export default function inboxRoutes(
  supabase: SupabaseClient,
  requireAuth: RequestHandler,
): Router {
  const router = express.Router();

  router.get(
    "/me",
    requireAuth,
    async (req: Request, res: Response<InboxResponse | ErrorResponse>) => {
      const myId = req.user?.id;

      if (!myId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { data: msgs, error } = await supabase
          .from("messages")
          .select("id, sender_id, recipient_id, message, timestamp")
          .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
          .order("timestamp", { ascending: false })
          .limit(300);

        if (error) {
          throw error;
        }

        const typedMessages = (msgs ?? []) as MessageRow[];
        const latestByOther = new Map<string, MessageRow>();

        for (const m of typedMessages) {
          const other =
            String(m.sender_id) === myId
              ? String(m.recipient_id)
              : String(m.sender_id);

          if (!latestByOther.has(other)) {
            latestByOther.set(other, m);
          }
        }

        const otherIds = Array.from(latestByOther.keys());

        if (otherIds.length === 0) {
          return res.json({ conversations: [] });
        }

        const { data: users, error: uErr } = await supabase
          .from("users")
          .select("id, fname, lname, role, profile_picture_url")
          .in("id", otherIds);

        if (uErr) {
          throw uErr;
        }

        const typedUsers = (users ?? []) as UserRow[];
        const userMap = new Map<string, UserRow>(
          typedUsers.map((u) => [String(u.id), u]),
        );

        const conversations: ConversationItem[] = otherIds.map((otherId) => {
          const u = userMap.get(String(otherId));
          const last = latestByOther.get(String(otherId));

          return {
            userId: otherId,
            name: u ? `${u.fname || ""} ${u.lname || ""}`.trim() : "Unknown",
            role: u?.role || null,
            profile_picture_url: u?.profile_picture_url || null,
            lastMessage: last?.message || "",
            lastTimestamp: last?.timestamp || null,
          };
        });

        conversations.sort((a, b) => {
          const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
          const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
          return tb - ta;
        });

        return res.json({ conversations });
      } catch (err) {
        console.error("GET /inbox/me error:", getErrorMessage(err));
        return res.status(500).json({ message: "Failed to load inbox" });
      }
    },
  );

  return router;
}
