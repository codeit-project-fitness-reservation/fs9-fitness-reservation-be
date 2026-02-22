import prisma from "../../config/prisma.js";
import { Prisma } from "@prisma/client";

/** 읽지 않은 알림만, 최근 30일 이내 */
const UNREAD_FILTER = (userId: string): Prisma.NotificationWhereInput => ({
  userId,
  isRead: false,
  createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
});

export async function createNotification(
  data: Prisma.NotificationUncheckedCreateInput,
) {
  return prisma.notification.create({ data });
}

export async function findNotificationById(id: string) {
  return prisma.notification.findUnique({ where: { id } });
}

export async function findManyNotifications(params: {
  userId: string;
  skip: number;
  take: number;
}) {
  return prisma.notification.findMany({
    where: UNREAD_FILTER(params.userId),
    skip: params.skip,
    take: params.take,
    orderBy: { createdAt: "desc" },
  });
}

export async function countNotifications(userId: string) {
  return prisma.notification.count({ where: UNREAD_FILTER(userId) });
}

export async function markAsRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function deleteNotification(id: string) {
  return prisma.notification.delete({ where: { id } });
}
