import { AppError } from "../../middlewares/errorHandler.ts";
import type { UserRole } from "@prisma/client";
import * as notificationRepo from "./notification.repository.ts";
import { publishToUser } from "./notification.sse.ts";
import type {
  CreateNotificationInput,
  ListNotificationsQuery,
  MarkReadInput,
} from "./notification.validation.ts";

type AuthUser = {
  id: string;
  role: UserRole;
};

// ── 공통 헬퍼: 다른 서비스에서 호출 ──────────────────────────────────────
export async function sendNotification(input: {
  userId: string;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  const created = await notificationRepo.createNotification({
    userId: input.userId,
    title: input.title,
    body: input.body ?? null,
    linkUrl: input.linkUrl ?? null,
  });
  publishToUser(created.userId, "notification.created", created);
  return created;
}

// ── 관리자 전용 수동 생성 ─────────────────────────────────────────────────
export async function createNotification(input: CreateNotificationInput) {
  return sendNotification(input);
}

// ── 알림 목록 (미읽음 + 30일 이내만 반환) ────────────────────────────────
export async function listNotifications(
  authUser: AuthUser,
  query: ListNotificationsQuery,
) {
  const page = Number((query as any).page ?? 1);
  const limit = Number((query as any).limit ?? 20);
  const safePage = Number.isFinite(page) && page >= 1 ? page : 1;
  const safeLimit =
    Number.isFinite(limit) && limit >= 1 && limit <= 100 ? limit : 20;

  const targetUserId =
    authUser.role === "ADMIN" && query.userId ? query.userId : authUser.id;

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    notificationRepo.findManyNotifications({
      userId: targetUserId,
      skip,
      take: safeLimit,
    }),
    notificationRepo.countNotifications(targetUserId),
  ]);

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}

// ── 알림 단건 조회 ─────────────────────────────────────────────────────────
export async function getNotificationById(authUser: AuthUser, id: string) {
  const n = await notificationRepo.findNotificationById(id);
  if (!n) {
    throw new AppError(404, "알림을 찾을 수 없습니다", "NOT_FOUND");
  }
  if (authUser.role !== "ADMIN" && n.userId !== authUser.id) {
    throw new AppError(403, "권한이 없습니다", "FORBIDDEN");
  }
  return n;
}

// ── 읽음 처리 (본인 또는 ADMIN) ──────────────────────────────────────────
export async function markNotificationRead(
  authUser: AuthUser,
  id: string,
  input: MarkReadInput,
) {
  const n = await notificationRepo.findNotificationById(id);
  if (!n) {
    throw new AppError(404, "알림을 찾을 수 없습니다", "NOT_FOUND");
  }
  if (authUser.role !== "ADMIN" && n.userId !== authUser.id) {
    throw new AppError(403, "권한이 없습니다", "FORBIDDEN");
  }

  const updated = input.isRead
    ? await notificationRepo.markAsRead(id)
    : n; // false 로 재요청 시 그대로 반환(언읽음 복원 필요 시 확장 가능)

  publishToUser(n.userId, "notification.updated", updated);
  return updated;
}

// ── 알림 삭제 (본인 또는 ADMIN) ──────────────────────────────────────────
export async function deleteNotificationById(authUser: AuthUser, id: string) {
  const n = await notificationRepo.findNotificationById(id);
  if (!n) {
    throw new AppError(404, "알림을 찾을 수 없습니다", "NOT_FOUND");
  }
  if (authUser.role !== "ADMIN" && n.userId !== authUser.id) {
    throw new AppError(403, "권한이 없습니다", "FORBIDDEN");
  }

  await notificationRepo.deleteNotification(id);
  publishToUser(n.userId, "notification.deleted", { id });
  return { deleted: true };
}
