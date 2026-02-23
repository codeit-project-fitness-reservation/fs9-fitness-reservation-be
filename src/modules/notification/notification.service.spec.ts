import { jest, describe, it, expect, afterEach } from "@jest/globals";

jest.unstable_mockModule("./notification.repository.ts", () => ({
  createNotification: jest.fn(),
  findNotificationById: jest.fn(),
  findManyNotifications: jest.fn(),
  countNotifications: jest.fn(),
  markAsRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

jest.unstable_mockModule("./notification.sse.ts", () => ({
  publishToUser: jest.fn(),
}));

const notificationService = await import("./notification.service.ts");
const notificationRepository = await import("./notification.repository.ts");

describe("Notification Service", () => {
  const authUser = { id: "user-1", role: "CUSTOMER" as const };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createNotification", () => {
    it("유효한 입력이면 알림을 생성하고 반환해야 한다", async () => {
      const input = {
        userId: "target-user",
        title: "제목",
        body: "내용",
      };
      const mockCreated = {
        id: "notif-1",
        userId: input.userId,
        title: input.title,
        body: input.body,
        isRead: false,
        linkUrl: null,
        createdAt: new Date(),
      };
      jest
        .mocked(notificationRepository.createNotification)
        .mockResolvedValue(mockCreated as any);

      const result = await notificationService.createNotification(input);

      expect(notificationRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: input.userId,
          title: input.title,
          body: input.body,
        })
      );
      expect(result).toEqual(mockCreated);
    });
  });

  describe("listNotifications", () => {
    it("알림 목록과 페이지 정보를 반환해야 한다", async () => {
      const mockItems = [
        {
          id: "notif-1",
          userId: "user-1",
          title: "제목",
          body: "내용",
          isRead: false,
        },
      ];
      jest
        .mocked(notificationRepository.findManyNotifications)
        .mockResolvedValue(mockItems as any);
      jest.mocked(notificationRepository.countNotifications).mockResolvedValue(1);

      const result = await notificationService.listNotifications(authUser, {
        page: 1,
        limit: 20,
      } as any);

      expect(notificationRepository.findManyNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", skip: 0, take: 20 })
      );
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("getNotificationById", () => {
    it("알림이 없으면 404를 던져야 한다", async () => {
      jest.mocked(notificationRepository.findNotificationById).mockResolvedValue(null);

      await expect(
        notificationService.getNotificationById(authUser, "notif-none")
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });

    it("타인의 알림 조회 시 403을 던져야 한다", async () => {
      jest.mocked(notificationRepository.findNotificationById).mockResolvedValue({
        id: "notif-1",
        userId: "other-user",
        title: "제목",
      } as any);

      await expect(
        notificationService.getNotificationById(authUser, "notif-1")
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN",
      });
    });

    it("본인 알림이면 해당 알림을 반환해야 한다", async () => {
      const mockNotification = {
        id: "notif-1",
        userId: "user-1",
        title: "제목",
        body: "내용",
        isRead: false,
      };
      jest
        .mocked(notificationRepository.findNotificationById)
        .mockResolvedValue(mockNotification as any);

      const result = await notificationService.getNotificationById(
        authUser,
        "notif-1"
      );

      expect(result).toEqual(mockNotification);
    });
  });

  describe("markNotificationRead", () => {
    it("알림이 없으면 404를 던져야 한다", async () => {
      jest.mocked(notificationRepository.findNotificationById).mockResolvedValue(null);

      await expect(
        notificationService.markNotificationRead(authUser, "notif-none", {
          isRead: true,
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });

    it("타인의 알림 읽음 처리 시 403을 던져야 한다", async () => {
      jest.mocked(notificationRepository.findNotificationById).mockResolvedValue({
        id: "notif-1",
        userId: "other-user",
        isRead: false,
      } as any);

      await expect(
        notificationService.markNotificationRead(authUser, "notif-1", {
          isRead: true,
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN",
      });
    });

    it("isRead가 true면 읽음 처리 후 반환해야 한다", async () => {
      const mockNotification = {
        id: "notif-1",
        userId: "user-1",
        isRead: false,
      };
      const mockUpdated = { ...mockNotification, isRead: true };
      jest
        .mocked(notificationRepository.findNotificationById)
        .mockResolvedValue(mockNotification as any);
      jest.mocked(notificationRepository.markAsRead).mockResolvedValue(mockUpdated as any);

      const result = await notificationService.markNotificationRead(
        authUser,
        "notif-1",
        { isRead: true }
      );

      expect(notificationRepository.markAsRead).toHaveBeenCalledWith("notif-1");
      expect(result.isRead).toBe(true);
    });
  });

  describe("deleteNotificationById", () => {
    it("알림이 없으면 404를 던져야 한다", async () => {
      jest.mocked(notificationRepository.findNotificationById).mockResolvedValue(null);

      await expect(
        notificationService.deleteNotificationById(authUser, "notif-none")
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });

    it("타인의 알림 삭제 시 403을 던져야 한다", async () => {
      jest.mocked(notificationRepository.findNotificationById).mockResolvedValue({
        id: "notif-1",
        userId: "other-user",
      } as any);

      await expect(
        notificationService.deleteNotificationById(authUser, "notif-1")
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN",
      });
    });

    it("본인 알림이면 삭제 후 { deleted: true }를 반환해야 한다", async () => {
      const mockNotification = {
        id: "notif-1",
        userId: "user-1",
      };
      jest
        .mocked(notificationRepository.findNotificationById)
        .mockResolvedValue(mockNotification as any);
      jest.mocked(notificationRepository.deleteNotification).mockResolvedValue(undefined as any);

      const result = await notificationService.deleteNotificationById(
        authUser,
        "notif-1"
      );

      expect(notificationRepository.deleteNotification).toHaveBeenCalledWith(
        "notif-1"
      );
      expect(result).toEqual({ deleted: true });
    });
  });
});
