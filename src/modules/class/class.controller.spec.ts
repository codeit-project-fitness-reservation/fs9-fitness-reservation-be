import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middlewares/errorHandler.ts";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./class.service.ts", () => ({
  createClass: jest.fn(),
  getClassStats: jest.fn(),
  getClasses: jest.fn(),
  getClassById: jest.fn(),
  updateClass: jest.fn(),
  deleteClass: jest.fn(),
  approveClass: jest.fn(),
  rejectClass: jest.fn(),
  createSlot: jest.fn(),
  updateSlot: jest.fn(),
  deleteSlot: jest.fn(),
  generateSlotsFromSchedule: jest.fn(),
}));

const classController = await import("./class.controller.ts");
const classService = await import("./class.service.ts");

describe("Class Controller", () => {
  let req: Partial<Request>;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: "seller-id", role: UserRole.SELLER },
      files: [],
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    next = jest.fn() as unknown as NextFunction;
  });

  describe("createClassHandler", () => {
    it("클래스를 성공적으로 생성해야 한다", async () => {
      req.body = { name: "test-class", centerId: "center-1" };
      jest.mocked(classService.createClass).mockResolvedValue({ id: "class-1", name: "test-class" } as any);

      await classController.createClassHandler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(classService.createClass).toHaveBeenCalled();
    });
  });

  describe("deleteClassHandler", () => {
    it("클래스(및 관련된 일정)를 성공적으로 소프트 딜리트해야 한다", async () => {
      req.params = { id: "class-1" };
      jest.mocked(classService.deleteClass).mockResolvedValue({
        message: "클래스가 삭제되었습니다",
      } as any);

      await classController.deleteClassHandler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(classService.deleteClass).toHaveBeenCalledWith(
        "seller-id",
        "class-1",
        UserRole.SELLER
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "클래스가 삭제되었습니다" },
      });
    });
  });
});
