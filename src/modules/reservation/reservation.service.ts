import prisma from "../../config/prisma.ts";
import { ReservationStatus, UserRole } from "@prisma/client";
import type {
  CreateReservationInput,
  CancelReservationInput,
  QueryReservationInput,
  QuerySellerSlotsInput,
  QueryReservationStatsInput,
} from "./reservation.validation.ts";
import type { PaginationResponse } from "../../types/common.types.ts";
import { AppError } from "../../middlewares/errorHandler.ts";
import * as reservationRepository from "./reservation.repository.ts";
import * as pointService from "../point/point.service.ts";

// [고객] 결제 및 예약하기
export async function createReservation(
  userId: string,
  data: CreateReservationInput,
  now: Date = new Date(),
) {
  const slot = await reservationRepository.findSlotWithClass(data.slotId);
  if (!slot) {
    throw new AppError(404, "슬롯을 찾을 수 없습니다", "SLOT_NOT_FOUND");
  }
  if (!slot.isOpen) {
    throw new AppError(400, "예약이 마감된 슬롯입니다", "SLOT_CLOSED");
  }
  if (slot.startAt < now) {
    throw new AppError(400, "지난 슬롯은 예약할 수 없습니다", "PAST_SLOT");
  }

  if (slot.currentReservation >= slot.capacity) {
    throw new AppError(400, "정원이 마감되었습니다", "SLOT_FULL");
  }
  if (slot.class.status !== "APPROVED") {
    throw new AppError(
      400,
      "승인된 클래스만 예약 가능합니다",
      "CLASS_NOT_APPROVED",
    );
  }
  const user = await reservationRepository.findUserWithPoint(userId);
  if (!user) {
    throw new AppError(404, "유저를 찾을 수 없습니다", "USER_NOT_FOUND");
  }
  let couponDiscount = 0;
  let userCoupon = null;

  if (data.userCouponId) {
    userCoupon = await reservationRepository.findUserCouponById(
      data.userCouponId,
    );

    if (!userCoupon) {
      throw new AppError(404, "쿠폰을 찾을 수 없습니다", "COUPON_NOT_FOUND");
    }

    if (userCoupon.usedAt) {
      throw new AppError(400, "이미 사용된 쿠폰입니다", "COUPON_USED");
    }

    if (userCoupon.expiresAt && userCoupon.expiresAt < now) {
      throw new AppError(400, "만료된 쿠폰입니다", "COUPON_EXPIRED");
    }

    if (userCoupon.discountPoints) {
      couponDiscount = userCoupon.discountPoints;
    } else if (userCoupon.discountPercentage) {
      couponDiscount = Math.floor(
        (slot.class.pricePoints * userCoupon.discountPercentage) / 100,
      );
    }
  }

  const pricePoints = slot.class.pricePoints;
  const paidPoints = Math.max(0, pricePoints - couponDiscount);

  if (user.pointBalance < paidPoints) {
    throw new AppError(400, "포인트가 부족합니다", "INSUFFICIENT_POINTS");
  }

  const reservation = await prisma.$transaction(async (tx) => {
    const updatedSlot =
      await reservationRepository.increaseSlotCurrentReservation(
        tx,
        data.slotId,
      );

    if (updatedSlot.currentReservation > updatedSlot.capacity) {
      throw new AppError(400, "정원이 마감되었습니다", "SLOT_FULL");
    }

    const newReservation = await tx.reservation.create({
      data: {
        userId,
        classId: slot.class.id,
        slotId: data.slotId,
        status: ReservationStatus.BOOKED,
        slotStartAt: slot.startAt,
        pricePoints,
        couponDiscountPoints: couponDiscount,
        paidPoints,
        userCouponId: data.userCouponId || null,
      },
      include: {
        class: true,
        slot: true,
        userCoupon: {
          include: {
            template: true,
          },
        },
      },
    });

    await pointService.usePoints(
      tx,
      userId,
      paidPoints,
      user.pointBalance,
      newReservation.id,
    );

    //쿠폰 사용 처리
    if (data.userCouponId) {
      await tx.userCoupon.update({
        where: { id: data.userCouponId },
        data: { usedAt: now },
      });
    }

    return newReservation;
  });

  return reservation;
}

// [공통] 예약 목록 조회
export async function getReservations(
  query: QueryReservationInput,
): Promise<PaginationResponse<any>> {
  const {
    userId,
    classId,
    slotId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    keyword,
    searchType,
  } = query;

  const where: any = {};
  if (userId) where.userId = userId;
  if (classId) where.classId = classId;
  if (slotId) where.slotId = slotId;
  if (status) where.status = status;

  if (keyword) {
    if (searchType === "User") {
      where.user = {
        OR: [
          { nickname: { contains: keyword, mode: "insensitive" } },
          { email: { contains: keyword, mode: "insensitive" } },
        ],
      };
    } else if (searchType === "Class") {
      where.class = {
        title: { contains: keyword, mode: "insensitive" },
      };
    } else if (searchType === "Center") {
      where.class = {
        center: {
          name: { contains: keyword, mode: "insensitive" },
        },
      };
    }
  }

  if (startDate || endDate) {
    where.slot = where.slot || {};
    where.slot.startAt = {};
    if (startDate) where.slot.startAt.gte = new Date(startDate);
    if (endDate) where.slot.startAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    reservationRepository.findManyReservations({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    reservationRepository.countReservations(where),
  ]);

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// [공통] 예약 상세 조회
export async function getReservationById(reservationId: string) {
  const reservation =
    await reservationRepository.findReservationById(reservationId);

  if (!reservation) {
    throw new AppError(404, "예약을 찾을 수 없습니다", "RESERVATION_NOT_FOUND");
  }

  return reservation;
}

// [고객/관리자] 예약 취소 및 환불
export async function cancelReservation(
  userId: string,
  reservationId: string,
  data: CancelReservationInput,
  canceledBy: UserRole,
  now: Date = new Date(),
) {
  const reservation =
    await reservationRepository.findReservationSimple(reservationId);

  if (!reservation) {
    throw new AppError(404, "예약을 찾을 수 없습니다", "RESERVATION_NOT_FOUND");
  }

  if (reservation.status === ReservationStatus.CANCELED) {
    throw new AppError(400, "이미 취소된 예약입니다", "ALREADY_CANCELED");
  }
  if (reservation.status === ReservationStatus.COMPLETED) {
    throw new AppError(
      400,
      "완료된 예약은 취소할 수 없습니다",
      "ALREADY_COMPLETED",
    );
  }

  if (canceledBy === UserRole.CUSTOMER && reservation.userId !== userId) {
    throw new AppError(403, "본인의 예약만 취소할 수 있습니다", "FORBIDDEN");
  }
  if (reservation.slot.startAt < now) {
    throw new AppError(
      400,
      "이미 시작된 예약은 취소할 수 없습니다",
      "PAST_RESERVATION",
    );
  }

  const updatedReservation = await prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CANCELED,
        canceledAt: now,
        canceledBy,
        cancelNote: data.cancelNote || null,
      },
    });

    await pointService.refundPoints(
      tx,
      reservation.userId,
      reservation.paidPoints,
      reservation.user.pointBalance,
      reservation.id,
    );

    return updated;
  });

  return updatedReservation;
}

// 판매자(SELLER) 예약 관련 서비스

// [판매자] 주간 내 클래스 슬롯 조회
export async function getSellerSlots(
  sellerId: string,
  query: QuerySellerSlotsInput,
) {
  const center = await reservationRepository.findCenterByOwnerId(sellerId);

  if (!center) {
    throw new AppError(404, "센터 정보를 찾을 수 없습니다", "CENTER_NOT_FOUND");
  }

  const params: {
    centerId: string;
    startDate: Date;
    endDate: Date;
    classId?: string;
  } = {
    centerId: center.id,
    startDate: new Date(query.startDate),
    endDate: new Date(query.endDate),
  };

  if (query.classId) {
    params.classId = query.classId;
  }

  const slots = await reservationRepository.findSlotsByCenterId(params);

  return slots;
}

// [판매자] 내 슬롯에 대한 예약 조회
export async function getSellerReservations(
  sellerId: string,
  query: QueryReservationInput,
): Promise<PaginationResponse<any>> {
  const center = await reservationRepository.findCenterByOwnerId(sellerId);

  if (!center) {
    throw new AppError(404, "센터 정보를 찾을 수 없습니다", "CENTER_NOT_FOUND");
  }

  const {
    page = 1,
    limit = 10,
    keyword,
    searchType,
    startDate,
    endDate,
    ...restQuery
  } = query;
  const skip = (page - 1) * limit;

  const where: any = { ...restQuery };

  if (keyword) {
    if (searchType === "User") {
      where.user = {
        OR: [
          { nickname: { contains: keyword, mode: "insensitive" } },
          { email: { contains: keyword, mode: "insensitive" } },
        ],
      };
    } else if (searchType === "Class") {
      where.class = {
        title: { contains: keyword, mode: "insensitive" },
      };
    } else if (searchType === "Center") {
      where.class = {
        center: {
          name: { contains: keyword, mode: "insensitive" },
        },
      };
    }
  }

  if (startDate || endDate) {
    where.slot = { startAt: {} };
    if (startDate) where.slot.startAt.gte = new Date(startDate);
    if (endDate) where.slot.startAt.lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    reservationRepository.findReservationsByCenterId({
      centerId: center.id,
      where,
      skip,
      take: limit,
    }),
    reservationRepository.countReservations({
      ...where,
      class: { centerId: center.id },
    }),
  ]);

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// [판매자] 예약 상세 조회 (결제정보 + 타임라인)
export async function getSellerReservationDetail(
  sellerId: string,
  reservationId: string,
) {
  const center = await reservationRepository.findCenterByOwnerId(sellerId);
  if (!center) {
    throw new AppError(404, "센터 정보를 찾을 수 없습니다", "CENTER_NOT_FOUND");
  }
  const reservation =
    await reservationRepository.findSellerReservationDetail(reservationId);
  if (!reservation) {
    throw new AppError(404, "예약을 찾을 수 없습니다", "RESERVATION_NOT_FOUND");
  }

  if (reservation.class.center.ownerId !== sellerId) {
    throw new AppError(
      403,
      "본인 센터의 예약만 조회할 수 있습니다",
      "FORBIDDEN",
    );
  }

  return reservation;
}

// [판매자] 특정 유저 예약 취소
export async function cancelReservationBySeller(
  sellerId: string,
  reservationId: string,
  data: CancelReservationInput,
) {
  const reservation =
    await reservationRepository.findReservationSimple(reservationId);

  if (!reservation) {
    throw new AppError(404, "예약을 찾을 수 없습니다", "RESERVATION_NOT_FOUND");
  }

  if (reservation.class.center.ownerId !== sellerId) {
    throw new AppError(403, "예약 취소 권한이 없습니다", "FORBIDDEN");
  }
  return cancelReservation(sellerId, reservationId, data, UserRole.SELLER);
}

// 예약 목록을 일괄 취소 + 포인트 환불 (트랜잭션)
async function cancelReservationsInBulk(
  reservations: Awaited<
    ReturnType<typeof reservationRepository.findFutureReservationsByClassId>
  >,
  reason: string,
): Promise<{ canceledCount: number }> {
  if (reservations.length === 0) {
    return { canceledCount: 0 };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const reservation of reservations) {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: ReservationStatus.CANCELED,
          canceledAt: now,
          canceledBy: UserRole.SELLER,
          cancelNote: reason,
        },
      });

      const currentUser = await tx.user.findUnique({
        where: { id: reservation.userId },
        select: { pointBalance: true },
      });

      await pointService.refundPoints(
        tx,
        reservation.userId,
        reservation.paidPoints,
        currentUser?.pointBalance ?? reservation.user.pointBalance,
        reservation.id,
      );
    }
  });

  return { canceledCount: reservations.length };
}

// [판매자] 클래스 수정/삭제시 예약 자동 취소 및 환불
export async function cancelReservationsByClassChange(
  classId: string,
  reason: string,
) {
  const reservations =
    await reservationRepository.findFutureReservationsByClassId(classId);
  return cancelReservationsInBulk(reservations, reason);
}

// [판매자] 슬롯 삭제시 예약 자동 취소 및 환불
export async function cancelReservationsBySlotChange(
  slotId: string,
  reason: string,
) {
  const reservations =
    await reservationRepository.findReservationsBySlotId(slotId);
  return cancelReservationsInBulk(reservations, reason);
}

// [판매자] 예약 완료 처리
export async function completeReservation(
  sellerId: string,
  reservationId: string,
  now: Date = new Date(),
) {
  const reservation =
    await reservationRepository.findReservationSimple(reservationId);

  if (!reservation) {
    throw new AppError(404, "예약을 찾을 수 없습니다", "RESERVATION_NOT_FOUND");
  }

  if (reservation.class.center.ownerId !== sellerId) {
    throw new AppError(403, "예약 완료 처리 권한이 없습니다", "FORBIDDEN");
  }

  if (reservation.status !== ReservationStatus.BOOKED) {
    throw new AppError(400, "예약 상태가 유효하지 않습니다", "INVALID_STATUS");
  }

  if (reservation.slot.endAt > now) {
    throw new AppError(
      400,
      "수업 종료 후 완료 처리가 가능합니다",
      "CLASS_NOT_ENDED",
    );
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.COMPLETED,
      completedAt: now,
    },
  });

  return updatedReservation;
}

// 관리자(ADMIN) 예약 관련 서비스

// [관리자] 최근 한달 예약 횟수 통계
export async function getReservationStats(query: QueryReservationStatsInput) {
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30일 전
  const [stats, dailyReservations] = await Promise.all([
    reservationRepository.getReservationStats({ startDate, endDate }),
    reservationRepository.getDailyReservationCounts({ startDate, endDate }),
  ]);

  const statusBreakdown = {
    BOOKED: 0,
    CANCELED: 0,
    COMPLETED: 0,
  };

  stats.statusBreakdown.forEach((item) => {
    if (item.status === ReservationStatus.BOOKED) {
      statusBreakdown.BOOKED = item._count;
    } else if (item.status === ReservationStatus.CANCELED) {
      statusBreakdown.CANCELED = item._count;
    } else if (item.status === ReservationStatus.COMPLETED) {
      statusBreakdown.COMPLETED = item._count;
    }
  });

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totalReservations: stats.totalCount,
    statusBreakdown,
    dailyReservations,
    totalRevenue: stats.totalRevenue,
    totalRefund: stats.totalRefund,
  };
}
