import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { AppError } from "../../middlewares/errorHandler.ts";

jest.unstable_mockModule("./review.repository.ts", () => ({
  findReviewByReservationId: jest.fn(),
  createReview: jest.fn(),
  findReviewsByClassId: jest.fn(),
  countReviewsByClassId: jest.fn(),
  findReviewsByCenterId: jest.fn(),
  countReviewsByCenterId: jest.fn(),
}));

jest.unstable_mockModule("../reservation/reservation.repository.ts", () => ({
  findReservationById: jest.fn(),
}));

const reviewService = await import("./review.service.ts");
const reviewRepository = await import("./review.repository.ts");
const reservationRepository = await import("../reservation/reservation.repository.ts");

describe("Review Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createReview", () => {
    it("존재하지 않는 예약에 대한 리뷰는 생성할 수 없다", async () => {
      jest.mocked(reservationRepository.findReservationById).mockResolvedValue(null);

      await expect(
        reviewService.createReview("user-1", {
          reservationId: "res-none",
          rating: 5,
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "RESERVATION_NOT_FOUND",
      });
    });

    it("타인의 예약에 리뷰를 작성하면 403 에러를 던져야 한다", async () => {
      jest.mocked(reservationRepository.findReservationById).mockResolvedValue({
        id: "res-1",
        userId: "other-user",
        status: "COMPLETED",
        classId: "class-1",
      } as any);

      await expect(
        reviewService.createReview("user-1", {
          reservationId: "res-1",
          rating: 5,
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN",
      });
    });

    it("완료되지 않은 예약에 리뷰를 작성하면 400 에러를 던져야 한다", async () => {
      jest.mocked(reservationRepository.findReservationById).mockResolvedValue({
        id: "res-1",
        userId: "user-1",
        status: "BOOKED",
        classId: "class-1",
      } as any);

      await expect(
        reviewService.createReview("user-1", {
          reservationId: "res-1",
          rating: 5,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_STATUS",
      });
    });

    it("이미 리뷰가 작성된 예약에 리뷰를 재작성하면 409 에러를 던져야 한다", async () => {
      jest.mocked(reservationRepository.findReservationById).mockResolvedValue({
        id: "res-1",
        userId: "user-1",
        status: "COMPLETED",
        classId: "class-1",
      } as any);
      jest.mocked(reviewRepository.findReviewByReservationId).mockResolvedValue({
        id: "review-existing",
      } as any);

      await expect(
        reviewService.createReview("user-1", {
          reservationId: "res-1",
          rating: 5,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "DUPLICATE_REVIEW",
      });
    });

    it("유효한 조건이면 리뷰를 성공적으로 생성해야 한다", async () => {
      jest.mocked(reservationRepository.findReservationById).mockResolvedValue({
        id: "res-1",
        userId: "user-1",
        status: "COMPLETED",
        classId: "class-1",
      } as any);
      jest.mocked(reviewRepository.findReviewByReservationId).mockResolvedValue(null);
      jest.mocked(reviewRepository.createReview).mockResolvedValue({
        id: "review-1",
        reservationId: "res-1",
        userId: "user-1",
        classId: "class-1",
        rating: 5,
        content: null,
      } as any);

      const result = await reviewService.createReview("user-1", {
        reservationId: "res-1",
        rating: 5,
      });

      expect(result.id).toBe("review-1");
      expect(result.rating).toBe(5);
      expect(reviewRepository.createReview).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationId: "res-1",
          userId: "user-1",
          classId: "class-1",
          rating: 5,
        })
      );
    });
  });

  describe("getReviewsByClass", () => {
    it("classId에 해당하는 리뷰 목록과 페이지 정보를 반환해야 한다", async () => {
      const mockReviews = [
        { id: "review-1", classId: "class-1", rating: 5, content: "탐수요" },
        { id: "review-2", classId: "class-1", rating: 4, content: "좋아요" },
      ];
      jest.mocked(reviewRepository.findReviewsByClassId).mockResolvedValue(mockReviews as any);
      jest.mocked(reviewRepository.countReviewsByClassId).mockResolvedValue(2);

      const result = await reviewService.getReviewsByClass("class-1", 1, 10);

      expect(reviewRepository.findReviewsByClassId).toHaveBeenCalledWith(
        "class-1",
        0,
        10
      );
      expect(result.reviews).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
    });

    it("리뷰가 없으면 빈 배열과 pagination을 반환한다", async () => {
      jest.mocked(reviewRepository.findReviewsByClassId).mockResolvedValue([]);
      jest.mocked(reviewRepository.countReviewsByClassId).mockResolvedValue(0);

      const result = await reviewService.getReviewsByClass("class-empty", 1, 10);

      expect(result.reviews).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
    });
  });
});
