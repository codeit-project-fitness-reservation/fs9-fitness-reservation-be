import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./coupon.service.ts", () => ({
  createCouponTemplate: jest.fn(),
  getMyTemplates: jest.fn(),
  giveCoupon: jest.fn(),
  updateCouponTemplate: jest.fn(),
  deleteCouponTemplate: jest.fn(),
}));

const couponController = await import("./coupon.controller.ts");
const couponService = await import("./coupon.service.ts");

describe("Coupon Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: "seller-id", role: UserRole.SELLER },
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("createCouponTemplateHandler", () => {
    it("성공적으로 쿠폰 템플릿을 생성해야 한다", async () => {
      const futureDate = new Date(Date.now() + 86400000);
      req.body = {
        name: "할인 쿠폰",
        discountType: "AMOUNT",
        usageValue: 1000,
        expiresAt: futureDate,
      };
      const mockCoupon = {
        id: "template-1",
        name: "할인 쿠폰",
        issuerId: "seller-id",
        discountPoints: 1000,
        discountPercentage: null,
        expiresAt: futureDate,
      };
      (couponService.createCouponTemplate as jest.Mock).mockResolvedValue(
        mockCoupon
      );

      await couponController.createCoupon(req as Request, res as Response);

      expect(couponService.createCouponTemplate).toHaveBeenCalledWith(
        "seller-id",
        UserRole.SELLER,
        expect.objectContaining({
          name: "할인 쿠폰",
          discountType: "AMOUNT",
          usageValue: 1000,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCoupon,
      });
    });
  });
});
