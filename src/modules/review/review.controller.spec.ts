import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./review.service.ts", () => ({
  createReview: jest.fn(),
  getReviewsByCenter: jest.fn(),
  getReviewsByClass: jest.fn(),
  getMyReviewByReservationId: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
}));

const reviewController = await import("./review.controller.ts");
const reviewService = await import("./review.service.ts");

describe("Review Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: "user-id", role: UserRole.CUSTOMER },
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("createReviewHandler", () => {
    it("리뷰 등록 요청을 성공적으로 처리해야 한다", async () => {
      req.body = { reservationId: "res-1", rating: 5 };
      const mockReview = {
        id: "review-1",
        reservationId: "res-1",
        userId: "user-id",
        classId: "class-1",
        rating: 5,
        content: null,
      };
      (reviewService.createReview as jest.Mock).mockResolvedValue(mockReview);

      await reviewController.createReviewHandler(
        req as Request,
        res as Response,
        next
      );

      expect(reviewService.createReview).toHaveBeenCalledWith(
        "user-id",
        expect.objectContaining({ reservationId: "res-1", rating: 5 })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReview,
      });
    });
  });

  describe("getReviewsByClassHandler", () => {
    it("classId에 해당하는 리뷰 목록을 반환해야 한다", async () => {
      req.params = { classId: "class-1" };
      req.query = { page: 1, limit: 10 } as any;
      const mockData = {
        reviews: [{ id: "review-1", classId: "class-1", rating: 5 }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      (reviewService.getReviewsByClass as jest.Mock).mockResolvedValue(mockData);

      await reviewController.getReviewsByClassHandler(
        req as Request,
        res as Response,
        next
      );

      expect(reviewService.getReviewsByClass).toHaveBeenCalledWith(
        "class-1",
        expect.any(Number),
        expect.any(Number)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });
  });
});
