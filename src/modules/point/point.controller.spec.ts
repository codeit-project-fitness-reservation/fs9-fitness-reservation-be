import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./point.service.ts", () => ({
  getMyBalance: jest.fn(),
  getMyPointHistory: jest.fn(),
  chargePoints: jest.fn(),
  getSellerSettlement: jest.fn(),
  getSellerTransactions: jest.fn(),
  adjustPoints: jest.fn(),
  getAdminPointHistory: jest.fn(),
}));

const pointController = await import("./point.controller.ts");
const pointService = await import("./point.service.ts");

describe("Point Controller", () => {
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
    };
    next = jest.fn();
  });

  describe("chargePointHandler", () => {
    it("포인트 충전 요청을 성공적으로 처리해야 한다", async () => {
      req.body = { amount: 1000 };
      const mockData = {
        pointHistory: { id: "ph-1", userId: "user-id", amount: 1000, type: "CHARGE" },
        balanceAfter: 1000,
      };
      (pointService.chargePoints as jest.Mock).mockResolvedValue(mockData);

      await pointController.chargePointHandler(
        req as Request,
        res as Response,
        next
      );

      expect(pointService.chargePoints).toHaveBeenCalledWith("user-id", {
        amount: 1000,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });
  });

  describe("adjustPointHandler", () => {
    it("유효한 요청이면 포인트를 지급/회수해야 한다", async () => {
      req.body = { userId: "target-user", amount: 500, memo: "이벤트 지급" };
      const mockData = {
        pointHistory: { id: "ph-1", userId: "target-user", amount: 500, type: "ADMIN" },
        balanceAfter: 500,
      };
      (pointService.adjustPoints as jest.Mock).mockResolvedValue(mockData);

      await pointController.adjustPointHandler(
        req as Request,
        res as Response,
        next
      );

      expect(pointService.adjustPoints).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "target-user", amount: 500, memo: "이벤트 지급" })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });

    it("서비스 오류 시 next를 호출해야 한다", async () => {
      req.body = { userId: "target-user", amount: -100, memo: "회수" };
      const mockError = new Error("포인트 조정 실패");
      (pointService.adjustPoints as jest.Mock).mockRejectedValue(mockError);

      await pointController.adjustPointHandler(
        req as Request,
        res as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(mockError);
    });
  });
});
