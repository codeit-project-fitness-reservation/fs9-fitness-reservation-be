import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middlewares/errorHandler.ts";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./center.service.ts", () => ({
  getCenters: jest.fn(),
  getMyCenter: jest.fn(),
  getCenterById: jest.fn(),
  updateCenter: jest.fn(),
}));

const centerController = await import("./center.controller.ts");
const centerService = await import("./center.service.ts");

describe("Center Controller", () => {
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
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    next = jest.fn() as unknown as NextFunction;
  });


  describe("getCentersHandler", () => {
    it("센터 목록을 필터링 및 페이지네이션하여 반환해야 한다", async () => {
      req.query = { page: "1", limit: "10" };
      jest.mocked(centerService.getCenters).mockResolvedValue({ data: [], total: 0 } as any);

      await centerController.getCentersHandler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(centerService.getCenters).toHaveBeenCalled();
    });
  });
});
