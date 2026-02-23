import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";

jest.unstable_mockModule("./auth.service.ts", () => ({
  createUser: jest.fn(),
  signIn: jest.fn(),
  refreshToken: jest.fn(),
  signOut: jest.fn(),
  getUserById: jest.fn(),
  updateCustomerProfile: jest.fn(),
  updateSellerProfile: jest.fn(),
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
    sign: jest.fn(),
  }
}));

jest.unstable_mockModule("../../config/env.ts", () => ({
  env: { SERVER_URL: "http://localhost:3000" },
}));

// 모듈이 모킹된 이후에 dynamic import로 불러와야 함
const authController = await import("./auth.controller.ts");
const authService = await import("./auth.service.ts");
const jwt = (await import("jsonwebtoken")).default;

describe("Auth Controller", () => {
  let req: Partial<Request>;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      cookies: {},
      params: {},
      user: { id: "test-user-id", role: "CUSTOMER" },
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
    next = jest.fn() as unknown as NextFunction;
  });

  describe("signupHandler", () => {
    it("성공적으로 회원가입 컨트롤러 응답을 반환해야 한다", async () => {
      req.body = { email: "test@domain.com", password: "pw" };
      const createdUser = { id: "1", email: "test@domain.com" };
      jest.mocked(authService.createUser).mockResolvedValue(createdUser);

      await authController.signupHandler(req as Request, res as Response, next);

      expect(authService.createUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: createdUser,
      });
    });
  });

  describe("loginHandler", () => {
    it("성공적으로 로그인 시 쿠키를 세팅하고 응답을 반환해야 한다", async () => {
      req.body = { email: "test@domain.com", password: "pw" };
      const loginResult = {
        user: { id: "1", email: "test@domain.com" },
        accessToken: "access.token",
        refreshToken: "refresh.token",
      };
      jest.mocked(authService.signIn).mockResolvedValue(loginResult);

      await authController.loginHandler(req as Request, res as Response, next);

      expect(authService.signIn).toHaveBeenCalledWith("test@domain.com", "pw");
      expect(res.cookie).toHaveBeenCalledTimes(2); // accessToken, refreshToken
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { user: loginResult.user },
      });
    });
  });

  describe("refreshHandler", () => {
    it("리프레시 토큰으로 새로운 토큰을 발급받아야 한다", async () => {
      req.cookies = { refreshToken: "valid.refresh.token" };
      jest.mocked(jwt.verify).mockReturnValue({ id: "1" } as any);
      
      const refreshResult = { accessToken: "new.access", refreshToken: "new.refresh" };
      jest.mocked(authService.refreshToken).mockResolvedValue(refreshResult);

      await authController.refreshHandler(req as Request, res as Response, next);

      expect(jwt.verify).toHaveBeenCalled();
      expect(authService.refreshToken).toHaveBeenCalledWith("1", "valid.refresh.token");
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { refreshed: true },
      });
    });
  });

  describe("logoutHandler", () => {
    it("성공적으로 로그아웃 응답과 쿠키 삭제를 수행해야 한다", async () => {
      await authController.logoutHandler(req as Request, res as Response, next);

      expect(res.clearCookie).toHaveBeenCalledTimes(2); // accessToken, refreshToken
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { loggedOut: true },
      });
    });
  });
});
