// server/src/socket/presence.ts
import type { Server, Socket } from "socket.io";
import { prisma } from "../index.js"; // used to validate membership on 'here'
import { roomFor } from "../socket.js";

type Status = "online" | "away" | "busy" | "offline";

type PresenceState = {
  userId: string;
  status: Status;
  lastSeen: number;         // epoch ms
};

const HEARTBEAT_TTL = 30_000;   // 30s without ping => offline
const SWEEP_INTERVAL = 10_000;  // check every 10s

// convId -> (userId -> PresenceState)
const PRESENCE = new Map<string, Map<string, PresenceState>>();

// convId -> Set(socketId) of watchers (subscribers who should receive events)
const SUBSCRIBERS = new Map<string, Set<string>>();

// socketId -> Set(convId) (what this socket is watching)
const WATCHING = new Map<string, Set<string>>();

// userId -> Set(socketId) (active sockets for the user)
const USER_SOCKETS = new Map<string, Set<string>>();

function now() { return Date.now(); }

function coerceStatus(s: any): Status {
  if (typeof s === "string") {
    const v = s.toLowerCase();
    if (v === "online" || v === "away" || v === "busy" || v === "offline") return v as Status;
  }
  return "online"; // default when client announces 'here'
}

function getConvPresence(convId: string) {
  let m = PRESENCE.get(convId);
  if (!m) { m = new Map(); PRESENCE.set(convId, m); }
  return m;
}

function getSubscribers(convId: string) {
  let s = SUBSCRIBERS.get(convId);
  if (!s) { s = new Set(); SUBSCRIBERS.set(convId, s); }
  return s;
}

function setWatching(socketId: string, convId: string, add: boolean) {
  let set = WATCHING.get(socketId);
  if (!set) { set = new Set(); WATCHING.set(socketId, set); }
  if (add) set.add(convId); else set.delete(convId);
}

function addUserSocket(userId: string, socketId: string) {
  let set = USER_SOCKETS.get(userId);
  if (!set) { set = new Set(); USER_SOCKETS.set(userId, set); }
  set.add(socketId);
}

function removeUserSocket(userId: string, socketId: string) {
  const set = USER_SOCKETS.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) USER_SOCKETS.delete(userId);
}

// broadcast a single user state update to all subscribers of a conversation
function emitPresenceUpdate(io: Server, conversationId: string, state: PresenceState) {
  const payload = {
    conversationId,
    userId: state.userId,
    status: state.status,
    lastActiveAt: new Date(state.lastSeen).toISOString(),
  };
  // send to explicit subscribers
  const subs = SUBSCRIBERS.get(conversationId);
  if (subs) subs.forEach(sid => io.to(sid).emit("presence:update", payload));
  // also emit to the conversation room for anyone listening there
  io.to(roomFor(conversationId)).emit("presence:update", payload);
}

// send a bulk snapshot to one socket
function emitBulkSnapshot(io: Server, socket: Socket, conversationId: string) {
  const states = Array.from(getConvPresence(conversationId).values()).map(s => ({
    userId: s.userId,
    status: s.status,
    lastActiveAt: new Date(s.lastSeen).toISOString(),
  }));
  socket.emit("presence:bulk", { conversationId, states });
}

// public API used by HTTP routes
export function getPresenceSnapshot(conversationId: string) {
  return Array.from(getConvPresence(conversationId).values()).map(s => ({
    userId: s.userId,
    status: s.status,
    lastActiveAt: new Date(s.lastSeen).toISOString(),
  }));
}

export function setupPresence(io: Server) {
  // periodic sweeper to mark users offline if TTL exceeded
  setInterval(() => {
    const t = now();
    for (const [convId, map] of PRESENCE.entries()) {
      for (const [userId, st] of map.entries()) {
        if (st.status !== "offline" && t - st.lastSeen > HEARTBEAT_TTL) {
          const updated: PresenceState = { userId, status: "offline", lastSeen: st.lastSeen };
          map.set(userId, updated);
          emitPresenceUpdate(io, convId, updated);
        }
      }
    }
  }, SWEEP_INTERVAL);

  io.on("connection", (socket) => {
    const userId = (socket.data as any)?.userId as string | undefined;
    if (userId) addUserSocket(userId, socket.id);

    // a client wants live presence for a conversation
    socket.on("presence:subscribe", ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      getSubscribers(conversationId).add(socket.id);
      setWatching(socket.id, conversationId, true);
      emitBulkSnapshot(io, socket, conversationId);
    });

    // client no longer needs presence
    socket.on("presence:unsubscribe", ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      getSubscribers(conversationId).delete(socket.id);
      setWatching(socket.id, conversationId, false);
    });

    // mark this user present in a conversation (optionally with status)
    socket.on("presence:here", async ({ conversationId, status }: { conversationId: string; status?: Status }) => {
      if (!userId || !conversationId) return;

      // (Optional) ensure this user really belongs to that conversation
      const isMember = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId },
        select: { id: true },
      });
      if (!isMember) return; // ignore spoofed 'here'

      const map = getConvPresence(conversationId);
      const st: PresenceState = {
        userId,
        status: coerceStatus(status),
        lastSeen: now(),
      };
      map.set(userId, st);
      emitPresenceUpdate(io, conversationId, st);
    });

    // heartbeat to keep online
    socket.on("presence:ping", () => {
      if (!userId) return;
      const watching = WATCHING.get(socket.id);
      if (!watching || watching.size === 0) return;
      const t = now();
      for (const convId of watching.values()) {
        const map = getConvPresence(convId);
        const old = map.get(userId);
        if (!old) continue;
        const updated: PresenceState = { ...old, lastSeen: t };
        map.set(userId, updated);
        // no broadcast on every ping; sweeper & other events keep things fresh
      }
    });

    // cleanup
    socket.on("disconnect", () => {
      // remove from subscriber lists
      const watching = WATCHING.get(socket.id);
      if (watching) {
        for (const convId of watching.values()) {
          const subs = SUBSCRIBERS.get(convId);
          if (subs) subs.delete(socket.id);
        }
        WATCHING.delete(socket.id);
      }
      if (userId) removeUserSocket(userId, socket.id);
      // we don't force 'offline' immediately; TTL sweeper will flip if no other socket pings
    });
  });
}
