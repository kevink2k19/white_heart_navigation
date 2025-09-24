import { Router } from "express";
import { prisma } from "../index.js";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth.js";
import { MessageType } from "@prisma/client";
import { io, roomFor } from "../socket.js";

const router = Router();
router.use(requireAuth);

// ensure the user is in the conversation
async function assertParticipant(userId: string, conversationId: string) {
  const cp = await prisma.conversationParticipant.findFirst({
    where: { userId, conversationId },
    select: { id: true },
  });
  return Boolean(cp);
}

/**
 * GET /conversations/:id/messages?cursor=<messageId>&limit=30
 * Returns oldest -> newest for easy render append.
 */
router.get("/conversations/:id/messages", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id: conversationId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const cursor = (req.query.cursor as string) || undefined;

  if (!(await assertParticipant(userId, conversationId))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      sender: { select: { id: true, name: true } },
      statuses: { where: { userId }, select: { deliveredAt: true, readAt: true } },
    },
  });

  // Normalize to the same "wire" shape used in POST response
  const data = messages
    .reverse()
    .map((m) => ({
      id: m.id,
      conversationId,
      type: m.type,
      text: m.text,
      mediaUrl: m.mediaUrl,
      mediaKind: m.mediaKind,
      mediaDurationS: m.mediaDurationS,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender ? { id: m.sender.id, name: m.sender.name } : null,
    }));

  res.json(data);
});

/**
 * POST /conversations/:id/messages
 * Body:
 *  - TEXT:  { type:"TEXT", text }
 *  - IMAGE: { type:"IMAGE", mediaUrl }
 *  - VOICE: { type:"VOICE", mediaUrl, mediaDurationS? }
 *  - ORDER: { type:"ORDER", orderPayload }
 */
router.post("/conversations/:id/messages", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id: conversationId } = req.params;
  const { type, text, mediaUrl, mediaKind, mediaDurationS, orderPayload } =
    (req.body || {}) as {
      type?: MessageType | string;
      text?: string;
      mediaUrl?: string;
      mediaKind?: string;
      mediaDurationS?: number;
      orderPayload?: unknown;
    };

  if (!(await assertParticipant(userId, conversationId))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const msgType = String(type || "").toUpperCase() as MessageType;
  switch (msgType) {
    case "TEXT":
      if (!text?.trim()) return res.status(400).json({ error: "text is required" });
      break;
    case "IMAGE":
    case "VOICE":
      if (!mediaUrl) return res.status(400).json({ error: "mediaUrl is required" });
      break;
    case "ORDER":
      if (orderPayload == null) return res.status(400).json({ error: "orderPayload is required" });
      break;
    case "SYSTEM":
      return res.status(400).json({ error: "SYSTEM messages cannot be sent by clients" });
    default:
      return res.status(400).json({ error: "Unsupported message type" });
  }

  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: msgType,
        text: text?.trim() || null,
        mediaUrl: mediaUrl || null,
        mediaKind:
          mediaKind ||
          (msgType === "VOICE" ? "audio" : msgType === "IMAGE" ? "image" : null),
        mediaDurationS: mediaDurationS ?? null,
        orderPayload: msgType === "ORDER" ? (orderPayload as any) : null,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    const participants = await tx.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    await tx.messageStatus.createMany({
      data: participants.map((p) => ({
        messageId: message.id,
        userId: p.userId,
        deliveredAt: p.userId === userId ? new Date() : null,
        readAt: p.userId === userId ? new Date() : null,
      })),
    });

    return message;
  });

  const wire = {
    id: created.id,
    conversationId,
    type: created.type,
    text: created.text,
    mediaUrl: created.mediaUrl,
    mediaKind: created.mediaKind,
    mediaDurationS: created.mediaDurationS,
    createdAt: created.createdAt.toISOString(),
    sender: created.sender ? { id: created.sender.id, name: created.sender.name } : null,
  };

  console.log("[emit] message:new ->", roomFor(conversationId), wire.id);
  io.to(roomFor(conversationId)).emit("message:new", wire);

  // IMPORTANT: return the same "wire" shape so the client appends consistently
  res.status(201).json(wire);
});

router.post("/messages/:id/delivered", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id: messageId } = req.params;

  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (!msg) return res.status(404).json({ error: "Message not found" });
  if (!(await assertParticipant(userId, msg.conversationId))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await prisma.messageStatus.updateMany({
    where: { messageId, userId, deliveredAt: null },
    data: { deliveredAt: new Date() },
  });
  res.json({ ok: true });
});

router.post("/messages/:id/read", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id: messageId } = req.params;

  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { createdAt: true, conversationId: true },
  });
  if (!msg) return res.status(404).json({ error: "Message not found" });
  if (!(await assertParticipant(userId, msg.conversationId))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await prisma.messageStatus.updateMany({
    where: {
      userId,
      readAt: null,
      message: { conversationId: msg.conversationId, createdAt: { lte: msg.createdAt } },
    },
    data: { readAt: new Date() },
  });

  res.json({ ok: true });
});

export default router;
