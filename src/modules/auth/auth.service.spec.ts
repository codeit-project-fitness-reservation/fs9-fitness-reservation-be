import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { AppError } from "../../middlewares/errorHandler.ts";
import { env } from "../../config/env.ts";

// auth.repository.ts의 모든 메소드를 jest.fn()으로 오버라이드
jest.unstable_mockModule("./auth.repository.ts", () => ({
  default: {
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateWithTx: jest.fn(),
    findByIdWithTx: jest.fn(),
  }
}));

jest.unstable_mockModule("../center/center.service.ts", () => ({
  updateMyCenter: jest.fn(),
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  }
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  }
}));

jest.unstable_mockModule("../../config/prisma.ts", () => ({
  default: {
    $transaction: jest.fn(),
  }
}));

const authService = await import("./auth.service.ts");
const authRepo = (await import("./auth.repository.ts")).default;
const centerService = await import("../center/center.service.ts");
const bcrypt = (await import("bcrypt")).default;
const jwt = (await import("jsonwebtoken")).default;
const prismaMock = (await import("../../config/prisma.ts")).default;

describe("Auth Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    it("존재하는 이메일이면 AppError(409)를 던져야 한다", async () => {
      (authRepo.findByEmail as jest.Mock).mockResolvedValue({ id: "1" });
      await expect(authService.createUser({ email: "test@test.com" })).rejects.toThrow(AppError);
    });

    it("존재하는 전화번호면 AppError(409)를 던져야 한다", async () => {
      (authRepo.findByEmail as jest.Mock).mockResolvedValue(null);
      (authRepo.findByPhone as jest.Mock).mockResolvedValue({ id: "1" });
      await expect(authService.createUser({ email: "test@test.com", phone: "010-1234-5678" })).rejects.toThrow(AppError);
    });

    it("새로운 유저 정보로 유저를 생성하고 비밀번호를 제외한 정보를 반환해야 한다", async () => {
      (authRepo.findByEmail as jest.Mock).mockResolvedValue(null);
      (authRepo.findByPhone as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
      
      const mockUser = {
        id: "1",
        email: "test@test.com",
        password: "hashedPassword",
        name: "test",
      };
      
      (authRepo.save as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.createUser({ 
        email: "test@test.com", 
        phone: "010-1234-5678", 
        password: "password123" 
      });
      
      expect(result).not.toHaveProperty("password");
      expect(result.email).toBe("test@test.com");
    });
  });

  describe("signIn", () => {
    it("존재하지 않는 사용자면 AppError(404)를 던져야 한다", async () => {
      (authRepo.findByEmail as jest.Mock).mockResolvedValue(null);
      await expect(authService.signIn("none@test.com", "password")).rejects.toThrow(AppError);
    });

    it("비밀번호가 일치하지 않으면 AppError(401)를 던져야 한다", async () => {
      (authRepo.findByEmail as jest.Mock).mockResolvedValue({ 
        id: "1", email: "test@test.com", password: "hashedPassword" 
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      await expect(authService.signIn("test@test.com", "wrongpassword")).rejects.toThrow(AppError);
    });

    it("유효한 자격증명일 경우 유저 정보와 토큰을 반환해야 한다", async () => {
      const mockUser = { 
        id: "1", email: "test@test.com", password: "hashedPassword", role: "CUSTOMER" 
      };
      (authRepo.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("mocked-token");

      const result = await authService.signIn("test@test.com", "password123");
      
      expect(result.accessToken).toBe("mocked-token");
      expect(result.refreshToken).toBe("mocked-token");
      expect(result.user).not.toHaveProperty("password");
    });
  });

  describe("refreshToken", () => {
    it("해당 유저가 없으면 AppError(401)를 던져야 한다", async () => {
      (authRepo.findById as jest.Mock).mockResolvedValue(null);
      await expect(authService.refreshToken("user-1", "some-token")).rejects.toThrow(AppError);
    });

    it("유효하지 않은 토큰이면 AppError(403)를 던져야 한다", async () => {
      (authRepo.findById as jest.Mock).mockResolvedValue({ id: "user-1" });
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error(); });
      await expect(authService.refreshToken("user-1", "invalid-token")).rejects.toThrow(AppError);
    });

    it("요청이 유효하면 새로운 리프레시와 액세스 토큰을 반환해야 한다", async () => {
      (authRepo.findById as jest.Mock).mockResolvedValue({ id: "user-1", role: "CUSTOMER" });
      (jwt.verify as jest.Mock).mockReturnValue({ id: "user-1" });
      (jwt.sign as jest.Mock).mockReturnValue("new-mocked-token");

      const result = await authService.refreshToken("user-1", "valid-token");
      expect(result.accessToken).toBe("new-mocked-token");
      expect(result.refreshToken).toBe("new-mocked-token");
    });
  });

  describe("updateCustomerProfile", () => {
    it("업데이트된 고객 프로필 정보를 반환해야 한다", async () => {
      const mockUser = { id: "user-1", nickname: "new_nick" };
      (authRepo.update as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await authService.updateCustomerProfile("user-1", { nickname: "new_nick" });
      
      expect(authRepo.update).toHaveBeenCalledWith("user-1", expect.objectContaining({ nickname: "new_nick" }));
      expect(result.nickname).toBe("new_nick");
    });
  });

  describe("updateSellerProfile", () => {
    it("판매자의 유저 및 센터 정보가 동일 트랜잭션 내에서 업데이트되어야 한다", async () => {
      const mockUser = { id: "user-1", nickname: "new_seller" };
      
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback("mocked-tx");
      });
      
      (authRepo.updateWithTx as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await authService.updateSellerProfile("user-1", { nickname: "new_seller" });
      
      expect(authRepo.updateWithTx).toHaveBeenCalledWith("mocked-tx", "user-1", expect.objectContaining({ nickname: "new_seller" }));
      expect(result.nickname).toBe("new_seller");
    });
  });
});
