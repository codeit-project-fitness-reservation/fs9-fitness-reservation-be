import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.ts";
import * as notificationService from "./notification.service.ts";
import { addClient, publishConnected, publishPing, removeClient } from "./notification.sse.ts";

// POST /notifications (ADMIN)
export async function createNotificationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await notificationService.createNotification(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

// GET /notifications/stream (SSE)
export async function streamNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    (res as any).flushHeaders?.();

    publishConnected(res);
    addClient(authReq.user.id, res);

    const heartbeat = setInterval(() => {
      publishPing(res);
    }, 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      removeClient(authReq.user.id, res);
      res.end();
    });
  } catch (error) {
    next(error);
  }
}

export async function listNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const result = await notificationService.listNotifications(
      authReq.user,
      req.query as any,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// GET /notifications/:id
export async function getNotificationByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const result = await notificationService.getNotificationById(
      authReq.user,
      id as string,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function markReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const updated = await notificationService.markNotificationRead(
      authReq.user,
      id as string,
      req.body,
    );
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteNotificationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const result = await notificationService.deleteNotificationById(
      authReq.user,
      id as string,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
