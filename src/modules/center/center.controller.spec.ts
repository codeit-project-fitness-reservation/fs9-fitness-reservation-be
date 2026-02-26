import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./center.service.ts", () => ({
  getCenters: jest.fn(),
  getMyCenter: jest.fn(),
  getCenterById: jest.fn(),
  updateCenter: jest.fn(),
}));

jest.unstable_mockModule("../../config/env.ts", () => ({
  env: {
    KAKAO_MAP_REST_API_KEY: "test-kakao-key",
  },
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

  describe("geocodeHandler", () => {
    let fetchSpy: jest.SpyInstance;

    afterEach(() => {
      fetchSpy?.mockRestore();
    });

    it("address 쿼리가 없으면 400 MISSING_ADDRESS를 반환한다", async () => {
      req.query = {};

      await centerController.geocodeHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: "MISSING_ADDRESS",
        })
      );
    });

    it("API 키가 있으면 fetch를 호출하고, 좌표를 반환한다", async () => {
      req.query = { address: "서울시 강남구" };
      fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          documents: [{ address: { x: "127.0", y: "37.5" } }],
        }),
      } as Response);

      await centerController.geocodeHandler(req as Request, res as Response, next);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("query=" + encodeURIComponent("서울시 강남구")),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "KakaoAK test-kakao-key" }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { lat: 37.5, lng: 127 },
      });
    });
  });
});
