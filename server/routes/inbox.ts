import express, { Request, Response, Router, RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParamsDictionary } from "express-serve-static-core";

interface ErrorResponse {
  message: string;
}

interface ThreadParams extends ParamsDictionary {
  threadId: string;
}

interface CreateThreadBody {
  recipient_id?: string;
  application_id?: string | null;
  fight_slot_id?: string | null;
}

interface SendThreadMessageBody {
  message?: string;
}

interface UserRow {
  id: string;
  fname?: string | null;
  lname?: string | null;
  role?: string | null;
  profile_picture_url?: string | null;
}

interface ThreadRow {
  id: string;
  participant_a: string;
  participant_b: string;
  application_id?: string | null;
  fight_slot_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_message_at?: string | null;
}

interface MessageRow {
  id: string;
  thread_id?: string | null;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  timestamp: string | null;
  read_at?: string | null;
  application_id?: string | null;
  fight_slot_id?: string | null;
}

function getErrorMessage(error: unknown, fallback = "Server error"): string {
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

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export default function inboxRoutes(
  supabase: SupabaseClient,
  requireAuth: RequestHandler,
): Router {
  const router = express.Router();

  router.get(
    "/me",
    requireAuth,
    async (req: Request, res: Response<any | ErrorResponse>) => {
      const myId = req.user?.id;

      if (!myId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { data: threads, error: threadErr } = await supabase
          .from("message_threads")
          .select(
            `
            id,
            participant_a,
            participant_b,
            application_id,
            fight_slot_id,
            created_at,
            updated_at,
            last_message_at
          `,
          )
          .or(`participant_a.eq.${myId},participant_b.eq.${myId}`)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .limit(100);

        if (threadErr) throw threadErr;

        const typedThreads = (threads ?? []) as ThreadRow[];

        if (!typedThreads.length) {
          return res.json({ conversations: [] });
        }

        const otherIds = [
          ...new Set(
            typedThreads.map((t) =>
              t.participant_a === myId ? t.participant_b : t.participant_a,
            ),
          ),
        ];

        const threadIds = typedThreads.map((t) => t.id);

        const { data: users, error: usersErr } = await supabase
          .from("users")
          .select("id, fname, lname, role, profile_picture_url")
          .in("id", otherIds);

        if (usersErr) throw usersErr;

        const userMap = new Map<string, UserRow>(
          ((users ?? []) as UserRow[]).map((u) => [u.id, u]),
        );

        const { data: messages, error: msgErr } = await supabase
          .from("messages")
          .select(
            "id, thread_id, sender_id, recipient_id, message, timestamp, read_at, application_id, fight_slot_id",
          )
          .in("thread_id", threadIds)
          .order("timestamp", { ascending: false })
          .limit(500);

        if (msgErr) throw msgErr;

        const typedMessages = (messages ?? []) as MessageRow[];

        const latestByThread = new Map<string, MessageRow>();
        const unreadByThread = new Map<string, number>();

        for (const m of typedMessages) {
          if (!m.thread_id) continue;

          if (!latestByThread.has(m.thread_id)) {
            latestByThread.set(m.thread_id, m);
          }

          const isUnreadForMe =
            m.recipient_id === myId && !m.read_at && m.sender_id !== myId;

          if (isUnreadForMe) {
            unreadByThread.set(
              m.thread_id,
              (unreadByThread.get(m.thread_id) || 0) + 1,
            );
          }
        }

        const slotIds = [
          ...new Set(
            typedThreads
              .map((t) => t.fight_slot_id)
              .filter(Boolean) as string[],
          ),
        ];

        let slotEventMap = new Map<string, any>();

        if (slotIds.length) {
          const { data: slots, error: slotErr } = await supabase
            .from("fight_slots")
            .select("id, event_id, discipline, weight_class")
            .in("id", slotIds);

          if (slotErr) throw slotErr;

          const typedSlots =
            (slots as Array<{
              id: string;
              event_id: string;
              discipline?: string | null;
              weight_class?: string | null;
            }> | null) ?? [];

          const eventIds = [...new Set(typedSlots.map((s) => s.event_id))];

          const { data: events, error: eventErr } = await supabase
            .from("events")
            .select("id, title, promotion_name, city, region, event_date")
            .in("id", eventIds);

          if (eventErr) throw eventErr;

          const eventMap = new Map(
            ((events ?? []) as any[]).map((e) => [e.id, e]),
          );

          slotEventMap = new Map(
            typedSlots.map((s) => [
              s.id,
              {
                slot: s,
                event: eventMap.get(s.event_id) || null,
              },
            ]),
          );
        }

        const conversations = typedThreads.map((thread) => {
          const otherId =
            thread.participant_a === myId
              ? thread.participant_b
              : thread.participant_a;

          const other = userMap.get(otherId);
          const latest = latestByThread.get(thread.id);
          const context = thread.fight_slot_id
            ? slotEventMap.get(thread.fight_slot_id)
            : null;

          return {
            threadId: thread.id,
            userId: otherId,
            name:
              [other?.fname, other?.lname].filter(Boolean).join(" ") ||
              "Unknown",
            role: other?.role || null,
            profile_picture_url: other?.profile_picture_url || null,

            lastMessage: latest?.message || "",
            lastTimestamp:
              latest?.timestamp ||
              thread.last_message_at ||
              thread.updated_at ||
              thread.created_at ||
              null,
            unreadCount: unreadByThread.get(thread.id) || 0,

            applicationId: thread.application_id || null,
            fightSlotId: thread.fight_slot_id || null,

            eventTitle: context?.event?.title || null,
            promotionName: context?.event?.promotion_name || null,
            discipline: context?.slot?.discipline || null,
            weightClass: context?.slot?.weight_class || null,
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

  router.post(
    "/threads",
    requireAuth,
    async (
      req: Request<unknown, any | ErrorResponse, CreateThreadBody>,
      res: Response<any | ErrorResponse>,
    ) => {
      const myId = req.user?.id;

      if (!myId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const recipientId = cleanText(req.body?.recipient_id);
      const applicationId = cleanText(req.body?.application_id) || null;
      const fightSlotId = cleanText(req.body?.fight_slot_id) || null;

      if (!recipientId) {
        return res.status(400).json({ message: "recipient_id is required." });
      }

      if (recipientId === myId) {
        return res.status(400).json({ message: "Cannot message yourself." });
      }

      try {
        const [a, b] = sortPair(myId, recipientId);

        let query = supabase
          .from("message_threads")
          .select(
            "id, participant_a, participant_b, application_id, fight_slot_id, created_at, updated_at, last_message_at",
          )
          .eq("participant_a", a)
          .eq("participant_b", b);

        if (applicationId) {
          query = query.eq("application_id", applicationId);
        } else {
          query = query.is("application_id", null);
        }

        if (fightSlotId) {
          query = query.eq("fight_slot_id", fightSlotId);
        } else {
          query = query.is("fight_slot_id", null);
        }

        const { data: existing, error: existingErr } =
          await query.maybeSingle();

        if (existingErr) throw existingErr;

        if (existing) {
          return res.status(200).json({ ok: true, thread: existing });
        }

        const now = new Date().toISOString();

        const { data: created, error: createErr } = await supabase
          .from("message_threads")
          .insert({
            participant_a: a,
            participant_b: b,
            application_id: applicationId,
            fight_slot_id: fightSlotId,
            updated_at: now,
            last_message_at: null,
          })
          .select(
            "id, participant_a, participant_b, application_id, fight_slot_id, created_at, updated_at, last_message_at",
          )
          .single();

        if (createErr) throw createErr;

        return res.status(201).json({ ok: true, thread: created });
      } catch (err) {
        console.error("POST /inbox/threads error:", getErrorMessage(err));
        return res.status(500).json({ message: "Failed to create thread" });
      }
    },
  );

  router.get<ThreadParams>(
    "/threads/:threadId/messages",
    requireAuth,
    async (req, res: Response<any | ErrorResponse>) => {
      const myId = req.user?.id;
      const threadId = req.params.threadId;

      if (!myId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { data: thread, error: threadErr } = await supabase
          .from("message_threads")
          .select("id, participant_a, participant_b")
          .eq("id", threadId)
          .maybeSingle();

        if (threadErr) throw threadErr;

        if (!thread) {
          return res.status(404).json({ message: "Thread not found." });
        }

        if (thread.participant_a !== myId && thread.participant_b !== myId) {
          return res.status(403).json({ message: "Not allowed." });
        }

        const { data: messages, error: msgErr } = await supabase
          .from("messages")
          .select(
            "id, thread_id, sender_id, recipient_id, message, timestamp, read_at, application_id, fight_slot_id",
          )
          .eq("thread_id", threadId)
          .order("timestamp", { ascending: true });

        if (msgErr) throw msgErr;

        return res.json({ messages: messages ?? [] });
      } catch (err) {
        console.error(
          "GET /inbox/threads/:threadId/messages error:",
          getErrorMessage(err),
        );
        return res.status(500).json({ message: "Failed to load messages" });
      }
    },
  );

  router.post<ThreadParams, any | ErrorResponse, SendThreadMessageBody>(
    "/threads/:threadId/messages",
    requireAuth,
    async (req, res) => {
      const myId = req.user?.id;
      const threadId = req.params.threadId;
      const bodyMessage = cleanText(req.body?.message);

      if (!myId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!bodyMessage) {
        return res.status(400).json({ message: "Message is required." });
      }

      try {
        const { data: thread, error: threadErr } = await supabase
          .from("message_threads")
          .select(
            "id, participant_a, participant_b, application_id, fight_slot_id",
          )
          .eq("id", threadId)
          .maybeSingle();

        if (threadErr) throw threadErr;

        if (!thread) {
          return res.status(404).json({ message: "Thread not found." });
        }

        if (thread.participant_a !== myId && thread.participant_b !== myId) {
          return res.status(403).json({ message: "Not allowed." });
        }

        const recipientId =
          thread.participant_a === myId
            ? thread.participant_b
            : thread.participant_a;

        const { data: created, error: createErr } = await supabase
          .from("messages")
          .insert({
            thread_id: threadId,
            sender_id: myId,
            recipient_id: recipientId,
            message: bodyMessage,
            application_id: thread.application_id ?? null,
            fight_slot_id: thread.fight_slot_id ?? null,
          })
          .select(
            "id, thread_id, sender_id, recipient_id, message, timestamp, read_at, application_id, fight_slot_id",
          )
          .single();

        if (createErr) throw createErr;

        const now = new Date().toISOString();

        await supabase
          .from("message_threads")
          .update({
            updated_at: now,
            last_message_at: created.timestamp || now,
          })
          .eq("id", threadId);

        return res.status(201).json({
          ok: true,
          message: created,
        });
      } catch (err) {
        console.error(
          "POST /inbox/threads/:threadId/messages error:",
          getErrorMessage(err),
        );
        return res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

  router.post<ThreadParams>(
    "/threads/:threadId/read",
    requireAuth,
    async (req, res: Response<any | ErrorResponse>) => {
      const myId = req.user?.id;
      const threadId = req.params.threadId;

      if (!myId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { data: thread, error: threadErr } = await supabase
          .from("message_threads")
          .select("id, participant_a, participant_b")
          .eq("id", threadId)
          .maybeSingle();

        if (threadErr) throw threadErr;

        if (!thread) {
          return res.status(404).json({ message: "Thread not found." });
        }

        if (thread.participant_a !== myId && thread.participant_b !== myId) {
          return res.status(403).json({ message: "Not allowed." });
        }

        const now = new Date().toISOString();

        const { error: updateErr } = await supabase
          .from("messages")
          .update({ read_at: now })
          .eq("thread_id", threadId)
          .eq("recipient_id", myId)
          .is("read_at", null);

        if (updateErr) throw updateErr;

        return res.json({ ok: true });
      } catch (err) {
        console.error(
          "POST /inbox/threads/:threadId/read error:",
          getErrorMessage(err),
        );
        return res.status(500).json({ message: "Failed to mark as read" });
      }
    },
  );

  return router;
}
