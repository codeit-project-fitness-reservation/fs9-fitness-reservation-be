import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./notification.service.ts", () => ({
  createNotification: jest.fn(),
  listNotifications: jest.fn(),
  getNotificationById: jest.fn(),
  markNotificationRead: jest.fn(),
  deleteNotificationById: jest.fn(),
}));

jest.unstable_mockModule("./notification.sse.ts", () => ({
  addClient: jest.fn(),
  publishConnected: jest.fn(),
  publishPing: jest.fn(),
  removeClient: jest.fn(),
}));

const notificationController = await import("./notification.controller.ts");
const notificationService = await import("./notification.service.ts");

describe("Notification Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: "user-id", role: UserRole.CUSTOMER },
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
    next = jest.fn();
  });

  describe("createNotificationHandler", () => {
    it("알림 생성 요청을 성공적으로 처리해야 한다", async () => {
      req.body = {
        userId: "target-user",
        title: "알림 제목",
        body: "알림 내용",
      };
      const mockNotification = {
        id: "notif-1",
        userId: "target-user",
        title: "알림 제목",
        body: "알림 내용",
        isRead: false,
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockNotification
      );

      await notificationController.createNotificationHandler(
        req as Request,
        res as Response,
        next
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "target-user",
          title: "알림 제목",
          body: "알림 내용",
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotification,
      });
    });
  });

  describe("listNotificationsHandler", () => {
    it("알림 목록을 반환해야 한다", async () => {
      req.query = { page: "1", limit: "20" } as any;
      const mockResult = {
        items: [
          {
            id: "notif-1",
            userId: "user-id",
            title: "제목",
            body: "내용",
            isRead: false,
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      (notificationService.listNotifications as jest.Mock).mockResolvedValue(
        mockResult
      );

      await notificationController.listNotificationsHandler(
        req as Request,
        res as Response,
        next
      );

      expect(notificationService.listNotifications).toHaveBeenCalledWith(
        { id: "user-id", role: UserRole.CUSTOMER },
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe("getNotificationByIdHandler", () => {
    it("단건 알림을 반환해야 한다", async () => {
      req.params = { id: "notif-1" };
      const mockNotification = {
        id: "notif-1",
        userId: "user-id",
        title: "제목",
        body: "내용",
        isRead: false,
      };
      (notificationService.getNotificationById as jest.Mock).mockResolvedValue(
        mockNotification
      );

      await notificationController.getNotificationByIdHandler(
        req as Request,
        res as Response,
        next
      );

      expect(notificationService.getNotificationById).toHaveBeenCalledWith(
        { id: "user-id", role: UserRole.CUSTOMER },
        "notif-1"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotification,
      });
    });
  });

  describe("markReadHandler", () => {
    it("읽음 처리 요청을 성공적으로 처리해야 한다", async () => {
      req.params = { id: "notif-1" };
      req.body = { isRead: true };
      const mockUpdated = {
        id: "notif-1",
        userId: "user-id",
        title: "제목",
        isRead: true,
      };
      (notificationService.markNotificationRead as jest.Mock).mockResolvedValue(
        mockUpdated
      );

      await notificationController.markReadHandler(
        req as Request,
        res as Response,
        next
      );

      expect(notificationService.markNotificationRead).toHaveBeenCalledWith(
        { id: "user-id", role: UserRole.CUSTOMER },
        "notif-1",
        { isRead: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdated,
      });
    });
  });

  describe("deleteNotificationHandler", () => {
    it("알림 삭제 요청을 성공적으로 처리해야 한다", async () => {
      req.params = { id: "notif-1" };
      const mockResult = { deleted: true };
      (notificationService.deleteNotificationById as jest.Mock).mockResolvedValue(
        mockResult
      );

      await notificationController.deleteNotificationHandler(
        req as Request,
        res as Response,
        next
      );

      expect(notificationService.deleteNotificationById).toHaveBeenCalledWith(
        { id: "user-id", role: UserRole.CUSTOMER },
        "notif-1"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });
});
