import { Prisma } from "@prisma/client";
import * as reviewRepository from "./review.repository.ts";
import * as reservationRepository from "../reservation/reservation.repository.ts";
import { AppError } from "../../middlewares/errorHandler.ts";
import type { CreateReviewInput, UpdateReviewInput } from "./review.validation.ts";

// [고객] 리뷰 생성
export async function createReview(
  userId: string,
  data: CreateReviewInput
) {
  const reservation = await reservationRepository.findReservationById(
    data.reservationId
  );

  if (!reservation) {
    throw new AppError(404, "예약을 찾을 수 없습니다", "RESERVATION_NOT_FOUND");
  }

  if (reservation.userId !== userId) {
    throw new AppError(
      403,
      "예약에 대한 접근 권한이 없습니다",
      "FORBIDDEN"
    );
  }

  // COMPLETED 상태만 리뷰 가능
  if (reservation.status !== "COMPLETED") {
    throw new AppError(
      400,
      "완료된 예약만 리뷰를 작성할 수 있습니다",
      "INVALID_STATUS"
    );
  }

  const existingReview = await reviewRepository.findReviewByReservationId(
    data.reservationId
  );
  if (existingReview) {
    throw new AppError(
      409,
      "이미 리뷰가 작성된 예약입니다",
      "DUPLICATE_REVIEW"
    );
  }

  return reviewRepository.createReview({
    reservationId: data.reservationId,
    userId,
    classId: reservation.classId,
    rating: data.rating,
    content: data.content || null,
    imgUrls: data.imgUrls || [],
  });
}

// [공통] 센터별 리뷰 목록 조회
export async function getReviewsByCenter(
  centerId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  const reviews = await reviewRepository.findReviewsByCenterId(
    centerId,
    skip,
    limit
  );
  const totalCount = await reviewRepository.countReviewsByCenterId(centerId);

  return {
    reviews,
    pagination: {
      totalCount,
      totalPage: Math.ceil(totalCount / limit),
      currentPage: page,
      limit,
    },
  };
}

// [공통] 클래스별 리뷰 목록 조회
export async function getReviewsByClass(
  classId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  const reviews = await reviewRepository.findReviewsByClassId(classId, skip, limit);
  const totalCount = await reviewRepository.countReviewsByClassId(classId);

  return {
    reviews,
    pagination: {
      totalCount,
      totalPage: Math.ceil(totalCount / limit),
      currentPage: page,
      limit,
    },
  };
}


// [고객] 내 예약 리뷰 조회
export async function getMyReviewByReservationId(
  userId: string,
  reservationId: string
) {
  const review = await reviewRepository.findReviewByReservationId(reservationId);

  if (!review) return null;

  if (review.userId !== userId) {
    throw new AppError(
      403,
      "리뷰에 대한 접근 권한이 없습니다",
      "FORBIDDEN"
    );
  }

  return review;
}

// [고객] 리뷰 수정
// [고객] 리뷰 수정
export async function updateReview(
  userId: string,
  reviewId: string,
  data: UpdateReviewInput
) {
  const review = await reviewRepository.findReviewById(reviewId);
  if (!review) {
    throw new AppError(404, "리뷰를 찾을 수 없습니다", "REVIEW_NOT_FOUND");
  }

  if (review.userId !== userId) {
    throw new AppError(
      403,
      "리뷰 수정 권한이 없습니다",
      "FORBIDDEN"
    );
  }

  return reviewRepository.updateReview(reviewId, {
    ...(data.rating !== undefined && { rating: data.rating }),
    ...(data.content !== undefined && { content: data.content }),
    ...(data.imgUrls !== undefined && { imgUrls: data.imgUrls }),
  });
}

// [고객] 리뷰 삭제
export async function deleteReview(userId: string, reviewId: string) {
  const review = await reviewRepository.findReviewById(reviewId);
  if (!review) {
    throw new AppError(404, "리뷰를 찾을 수 없습니다", "REVIEW_NOT_FOUND");
  }

  if (review.userId !== userId) {
    throw new AppError(
      403,
      "리뷰 삭제 권한이 없습니다",
      "FORBIDDEN"
    );
  }

  return reviewRepository.deleteReview(reviewId);
}
