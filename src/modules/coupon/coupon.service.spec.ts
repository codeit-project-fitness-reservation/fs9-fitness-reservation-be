import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./coupon.repository.ts", () => ({
  createTemplate: jest.fn(),
  findTemplates: jest.fn(),
  findTemplateById: jest.fn(),
  giveCouponToUser: jest.fn(),
}));

jest.unstable_mockModule("../user/user.repository.ts", () => ({
  findUserById: jest.fn(),
}));

const couponService = await import("./coupon.service.ts");
const couponRepository = await import("./coupon.repository.ts");
const userRepository = await import("../user/user.repository.ts");

describe("Coupon Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCouponTemplate", () => {
    const futureDate = new Date(Date.now() + 86400000);

    it("쿠폰 템플릿 정보를 올바르게 저장해야 한다", async () => {
      const input = {
        name: "1천원 할인",
        discountType: "AMOUNT" as const,
        usageValue: 1000,
        expiresAt: futureDate,
      };
      jest.mocked(userRepository.findUserById).mockResolvedValue({
        id: "seller-1",
        center: { id: "center-1" },
      } as any);
      const savedTemplate = {
        id: "template-1",
        name: input.name,
        issuerId: "seller-1",
        centerId: "center-1",
        discountPoints: 1000,
        discountPercentage: null,
        expiresAt: futureDate,
      };
      jest.mocked(couponRepository.createTemplate).mockResolvedValue(savedTemplate as any);

      const result = await couponService.createCouponTemplate("seller-1", UserRole.SELLER, input);

      expect(result).toEqual(savedTemplate);
      expect(couponRepository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          discountPoints: 1000,
          discountPercentage: null,
          issuerId: "seller-1",
          centerId: "center-1",
        })
      );
    });

    it("만료일이 과거이면 에러를 던져야 한다", async () => {
      const pastDate = new Date(Date.now() - 86400000);
      jest.mocked(userRepository.findUserById).mockResolvedValue({
        id: "seller-1",
        center: { id: "center-1" },
      } as any);

      await expect(
        couponService.createCouponTemplate("seller-1", UserRole.SELLER, {
          name: "테스트",
          discountType: "AMOUNT" as const,
          usageValue: 1000,
          expiresAt: pastDate,
        })
      ).rejects.toThrow("만료일은 현재 시간 이후여야 합니다.");
    });

    it("할인율이 100%를 초과하면 에러를 던져야 한다", async () => {
      jest.mocked(userRepository.findUserById).mockResolvedValue({
        id: "seller-1",
        center: { id: "center-1" },
      } as any);

      await expect(
        couponService.createCouponTemplate("seller-1", UserRole.SELLER, {
          name: "테스트",
          discountType: "PERCENTAGE" as const,
          usageValue: 150,
          expiresAt: futureDate,
        })
      ).rejects.toThrow("할인율은 0%에서 100% 사이여야 합니다.");
    });

    it("ADMIN이 쿠폰을 생성하면 centerId는 null이어야 한다", async () => {
      const savedTemplate = {
        id: "template-2",
        name: "관리자 쿠폰",
        issuerId: "admin-1",
        centerId: null,
        discountPoints: 500,
        discountPercentage: null,
        expiresAt: futureDate,
      };
      jest.mocked(couponRepository.createTemplate).mockResolvedValue(savedTemplate as any);

      const result = await couponService.createCouponTemplate("admin-1", UserRole.ADMIN, {
        name: "관리자 쿠폰",
        discountType: "AMOUNT" as const,
        usageValue: 500,
        expiresAt: futureDate,
      });

      expect(couponRepository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ centerId: null })
      );
      expect(result.centerId).toBeNull();
    });
  });
});
