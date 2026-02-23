import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { AppError } from "../../middlewares/errorHandler.ts";

jest.unstable_mockModule("./user.repository.ts", () => ({
  findManyUsers: jest.fn(),
  findUserById: jest.fn(),
  getUserStats: jest.fn(),
  updateUserNote: jest.fn(),
}));

const userService = await import("./user.service.ts");
const userRepository = await import("./user.repository.ts");

describe("User Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getUsers", () => {
    it("회원 목록과 총 갯수를 올바른 포맷으로 반환해야 한다", async () => {
      const mockUsers = [
        { id: "1", _count: { userCoupons: 2 } }
      ];
      (userRepository.findManyUsers as jest.Mock).mockResolvedValue({ users: mockUsers, totalCount: 1 });
      
      const result = await userService.getUsers({ page: 1, limit: 10 });
      
      expect(result.users[0]?.couponCount).toBe(2);
      expect(result.totalCount).toBe(1);
    });
  });

  describe("getUserById", () => {
    it("존재하지 않는 회원 조회 시 에러를 던져야 한다", async () => {
      (userRepository.findUserById as jest.Mock).mockResolvedValue(null);
      await expect(userService.getUserById("none-id")).rejects.toThrow(AppError);
    });

    it("존재하는 회원 조회 시 포맷된 데이터를 반환해야 한다", async () => {
      const mockUser = {
        id: "1",
        _count: { userCoupons: 2, reservations: 1, reviews: 0 }
      };
      (userRepository.findUserById as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await userService.getUserById("1");
      
      expect(result.couponCount).toBe(2);
      expect(result.reservationCount).toBe(1);
    });
  });

  describe("updateUserNote", () => {
    it("존재하지 않는 회원 메모 업데이트 시 에러를 발생시켜야 한다", async () => {
      (userRepository.findUserById as jest.Mock).mockResolvedValue(null);
      await expect(userService.updateUserNote("none-id", "note")).rejects.toThrow(AppError);
    });

    it("회원 메모가 정상적으로 업데이트되어야 한다", async () => {
      (userRepository.findUserById as jest.Mock).mockResolvedValue({ id: "1" });
      (userRepository.updateUserNote as jest.Mock).mockResolvedValue({ id: "1", note: "new note" });
      
      const result = await userService.updateUserNote("1", "new note");
      expect(result.note).toBe("new note");
      expect(userRepository.updateUserNote).toHaveBeenCalledWith("1", "new note");
    });
  });
});
