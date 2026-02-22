import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  createNotificationHandler,
  deleteNotificationHandler,
  getNotificationByIdHandler,
  listNotificationsHandler,
  markReadHandler,
  streamNotificationsHandler,
} from "./notification.controller.ts";
import {
  createNotificationSchema,
  listNotificationsSchema,
  markReadSchema,
  notificationIdParamSchema,
} from "./notification.validation.ts";

const router = Router();

// POST /notifications — 관리자가 수동으로 알림 생성
router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  validate(createNotificationSchema),
  createNotificationHandler,
);

// GET /notifications/stream — SSE (로그인 필요)
// NOTE: "/:id" 보다 먼저 선언
router.get("/stream", authenticate, streamNotificationsHandler);

// GET /notifications — 내 미읽음 알림 목록 (30일 이내)
router.get(
  "/",
  authenticate,
  validate(listNotificationsSchema),
  listNotificationsHandler,
);

// GET /notifications/:id — 단건 조회
router.get(
  "/:id",
  authenticate,
  validate(notificationIdParamSchema),
  getNotificationByIdHandler,
);

// PATCH /notifications/:id — 읽음 처리 (본인 또는 ADMIN)
router.patch(
  "/:id",
  authenticate,
  validate(markReadSchema),
  markReadHandler,
);

// DELETE /notifications/:id — 삭제 (본인 또는 ADMIN)
router.delete(
  "/:id",
  authenticate,
  validate(notificationIdParamSchema),
  deleteNotificationHandler,
);

export default router;
