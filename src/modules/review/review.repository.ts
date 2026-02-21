import prisma from "../../config/prisma.ts";
import { Prisma } from "@prisma/client";

// 리뷰 생성
export async function createReview(data: Prisma.ReviewUncheckedCreateInput) {
  return prisma.review.create({
    data,
  });
}

// 센터별 리뷰 조회
export async function findReviewsByCenterId(
  centerId: string,
  skip: number,
  take: number
) {
  return prisma.review.findMany({
    where: {
      class: {
        centerId,
        deletedAt: null,
      },
    },
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          profileImgUrl: true,
        },
      },
      class: {
        select: {
          id: true,
          title: true, 
          category: true, 
          imgUrls: true, 
        },
      },
      reservation: {
        select: {
           id: true,
           slotStartAt: true
        }
      }
    },
  });
}

// 센터별 리뷰 개수 조회
export async function countReviewsByCenterId(centerId: string) {
  return prisma.review.count({
    where: {
      class: {
        centerId,
        deletedAt: null,
      },
    },
  });
}

// 클래스별 리뷰 조회
export async function findReviewsByClassId(
  classId: string,
  skip: number,
  take: number
) {
  return prisma.review.findMany({
    where: {
      classId,
      class: { deletedAt: null },
    },
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          profileImgUrl: true,
        },
      },
      reservation: {
        select: {
          id: true,
          slotStartAt: true,
        },
      },
    },
  });
}

// 클래스별 리뷰 개수 조회
export async function countReviewsByClassId(classId: string) {
  return prisma.review.count({
    where: {
      classId,
      class: { deletedAt: null },
    },
  });
}


// 예약 ID로 리뷰 조회
export async function findReviewByReservationId(reservationId: string) {
  return prisma.review.findUnique({
    where: {
      reservationId,
    },
  });
}

// 리뷰 ID로 조회
export async function findReviewById(reviewId: string) {
  return prisma.review.findUnique({
    where: { id: reviewId },
  });
}

// 리뷰 수정
export async function updateReview(
  reviewId: string,
  data: Prisma.ReviewUpdateInput
) {
  return prisma.review.update({
    where: { id: reviewId },
    data,
  });
}

// 리뷰 삭제
export async function deleteReview(reviewId: string) {
  return prisma.review.delete({
    where: { id: reviewId },
  });
}
