import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middlewares/errorHandler.ts";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./user.service.ts", () => ({
  getUsers: jest.fn(),
  getUserById: jest.fn(),
  getUserStats: jest.fn(),
  updateUserNote: jest.fn(),
}));

const userController = await import("./user.controller.ts");
const userService = await import("./user.service.ts");

describe("User Controller", () => {
  let req: Partial<Request>;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: "test-admin-id", role: UserRole.ADMIN },
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    next = jest.fn() as unknown as NextFunction;
  });

  describe("getUsersHandler", () => {
    it("성공적으로 회원 목록 조회 응답을 반환해야 한다", async () => {
      req.query = { page: "1", limit: "10" };
      jest.mocked(userService.getUsers).mockResolvedValue({ users: [], totalCount: 0 } as any);

      await userController.getUsersHandler(req as Request, res as Response, next);

      expect(userService.getUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("getUserByIdHandler", () => {
    it("본인이 아니면서 관리자도 아니면 next에 403 에러를 전달해야 한다", async () => {
      req.params = { id: "other-user-id" };
      req.user = { id: "my-id", role: UserRole.CUSTOMER };

      await userController.getUserByIdHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403, code: "FORBIDDEN" })
      );
    });

    it("정상적으로 유저 정보를 반환해야 한다", async () => {
      req.params = { id: "target-id" };
      req.user = { id: "admin-id", role: UserRole.ADMIN };
      jest.mocked(userService.getUserById).mockResolvedValue({ id: "target-id" } as any);

      await userController.getUserByIdHandler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe("patchUserNoteHandler", () => {
    it("관리자가 아니면 next에 403 에러를 전달해야 한다", async () => {
      req.params = { id: "some-id" };
      req.body = { note: "hello" };
      req.user = { id: "user-id", role: UserRole.CUSTOMER };

      await userController.patchUserNoteHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403, code: "FORBIDDEN" })
      );
    });

    it("메모 수정을 성공적으로 처리해야 한다", async () => {
      req.params = { id: "some-id" };
      req.body = { note: "updated note" };
      req.user = { id: "admin-id", role: UserRole.ADMIN };
      jest.mocked(userService.updateUserNote).mockResolvedValue({ id: "some-id", note: "updated note" } as any);

      await userController.patchUserNoteHandler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
