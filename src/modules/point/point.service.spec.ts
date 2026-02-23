import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { PointUsed } from "@prisma/client";

jest.unstable_mockModule("./point.repository.ts", () => ({
  findUserById: jest.fn(),
  incrementUserPoint: jest.fn(),
  decrementUserPoint: jest.fn(),
  createPointHistory: jest.fn(),
  findPointHistories: jest.fn(),
  countPointHistories: jest.fn(),
  findByPaymentKey: jest.fn(),
  executeTransaction: jest.fn(),
}));

const pointService = await import("./point.service.ts");
const pointRepository = await import("./point.repository.ts");

describe("Point Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("chargePoints", () => {
    it("유저의 포인트 총액을 올바르게 증가시켜야 한다", async () => {
      const userId = "user-1";
      const amount = 500;
      const currentBalance = 100;

      (pointRepository.findUserById as jest.Mock).mockResolvedValue({
        id: userId,
        pointBalance: currentBalance,
      });
      (pointRepository.findByPaymentKey as jest.Mock).mockResolvedValue(null);

      const mockHistory = {
        id: "ph-1",
        userId,
        type: PointUsed.CHARGE,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + amount,
      };
      (pointRepository.incrementUserPoint as jest.Mock).mockResolvedValue(
        undefined
      );
      (pointRepository.createPointHistory as jest.Mock).mockResolvedValue(
        mockHistory
      );
      (pointRepository.executeTransaction as jest.Mock).mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => cb(null)
      );

      const result = await pointService.chargePoints(userId, { amount });

      expect(result.balanceAfter).toBe(currentBalance + amount);
      expect(result.pointHistory).toEqual(mockHistory);
      expect(pointRepository.findUserById).toHaveBeenCalledWith(userId);
      expect(pointRepository.executeTransaction).toHaveBeenCalled();
    });
  });
});
