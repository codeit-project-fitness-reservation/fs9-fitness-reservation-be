import type { Response } from "express";

type SseEventName =
  | "connected"
  | "ping"
  | "notification.created"
  | "notification.updated"
  | "notification.deleted";

const clients = new Map<string, Set<Response>>();

function writeEvent(res: Response, event: SseEventName, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function addClient(userId: string, res: Response) {
  const set = clients.get(userId) ?? new Set<Response>();
  set.add(res);
  clients.set(userId, set);
}

export function removeClient(userId: string, res: Response) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    clients.delete(userId);
  }
}

export function publishToUser(
  userId: string,
  event: SseEventName,
  data: unknown,
) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;

  for (const res of set) {
    try {
      writeEvent(res, event, data);
    } catch (err) {
      console.error("SSE 전송 실패:", err);
      set.delete(res);
    }
  }
}

export function publishConnected(res: Response) {
  writeEvent(res, "connected", { ok: true });
}

export function publishPing(res: Response) {
  writeEvent(res, "ping", { t: Date.now() });
}
