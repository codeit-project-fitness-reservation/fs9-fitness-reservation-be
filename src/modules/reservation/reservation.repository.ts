import prisma from "../../config/prisma.ts";
import { Prisma, ReservationStatus, UserRole } from "@prisma/client";

// 예약 생성
export async function createReservation(
  data: Prisma.ReservationUncheckedCreateInput,
) {
  return prisma.reservation.create({
    data,
    include: {
      class: true,
      slot: true,
      userCoupon: { include: { template: true } },
    },
  });
}

// 예약 ID로 상세 조회
export async function findReservationById(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          phone: true,
          profileImgUrl: true,
        },
      },
      class: {
        include: {
          center: true,
        },
      },
      slot: true,
      userCoupon: {
        include: {
          template: true,
        },
      },
      review: true,
    },
  });
}

// [판매자] 예약 상세 조회 (결제정보 + 타임라인 포함)
export async function findSellerReservationDetail(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          phone: true,
          profileImgUrl: true,
        },
      },
      class: {
        include: {
          center: true,
        },
      },
      slot: true,
      userCoupon: {
        include: {
          template: true,
        },
      },
      review: true,
      pointHistories: {
        select: {
          id: true,
          type: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          orderId: true,
          paymentKey: true,
          memo: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

// 예약 ID로 조회 (간단, 취소/완료 처리용)
export async function findReservationSimple(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      slot: true,
      class: {
        include: {
          center: true,
        },
      },
      user: true,
    },
  });
}

// 예약 목록 조회 (페이지네이션)
export async function findManyReservations(params: {
  where: Prisma.ReservationWhereInput;
  skip: number;
  take: number;
  orderBy?: Prisma.ReservationOrderByWithRelationInput;
}) {
  return prisma.reservation.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: params.orderBy || { createdAt: "desc" },
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
          bannerUrl: true,
          center: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      slot: {
        select: {
          startAt: true,
          endAt: true,
          capacity: true,
          _count: {
            select: {
              reservations: {
                where: {
                  status: ReservationStatus.BOOKED,
                },
              },
            },
          },
        },
      },
      userCoupon: {
        include: {
          template: true,
        },
      },
    },
  });
}

// 예약 개수 조회
export async function countReservations(where: Prisma.ReservationWhereInput) {
  return prisma.reservation.count({ where });
}

// 슬롯별 예약 수 조회 (정원 체크용)
export async function countReservationsBySlot(
  slotId: string,
  status: ReservationStatus = ReservationStatus.BOOKED,
) {
  return prisma.reservation.count({
    where: {
      slotId,
      status,
    },
  });
}

//  판매자 관련 조회

// 판매자의 센터 슬롯 조회 (주간 조회용)
export async function findSlotsByCenterId(params: {
  centerId: string;
  startDate: Date;
  endDate: Date;
  classId?: string;
}) {
  const where: Prisma.ClassSlotWhereInput = {
    class: {
      centerId: params.centerId,
      ...(params.classId && { id: params.classId }),
      deletedAt: null,
    },
    startAt: {
      gte: params.startDate,
      lte: params.endDate,
    },
    deletedAt: null,
  };

  return prisma.classSlot.findMany({
    where,
    include: {
      class: {
        select: {
          id: true,
          title: true,
          category: true,
          level: true,
        },
      },
      _count: {
        select: {
          reservations: {
            where: {
              status: ReservationStatus.BOOKED,
            },
          },
        },
      },
    },
    orderBy: {
      startAt: "asc",
    },
  });
}

// 판매자의 예약 조회 (센터별)
export async function findReservationsByCenterId(params: {
  centerId: string;
  where: Prisma.ReservationWhereInput;
  skip: number;
  take: number;
}) {
  const mergedWhere: Prisma.ReservationWhereInput = {
    ...params.where,
    class: {
      centerId: params.centerId,
    },
  };

  return findManyReservations({
    where: mergedWhere,
    skip: params.skip,
    take: params.take,
  });
}

// 클래스의 미래 예약 조회 (클래스 변경/삭제시 사용)
export async function findFutureReservationsByClassId(classId: string) {
  return prisma.reservation.findMany({
    where: {
      classId,
      status: ReservationStatus.BOOKED,
      slot: {
        startAt: {
          gte: new Date(),
        },
      },
    },
    include: {
      user: true,
      slot: true,
    },
  });
}

// 슬롯의 예약 조회 (슬롯 삭제 시 취소/환불 대상)
export async function findReservationsBySlotId(slotId: string) {
  return prisma.reservation.findMany({
    where: {
      slotId,
      status: ReservationStatus.BOOKED,
    },
    include: {
      user: true,
      slot: true,
    },
  });
}

// 예약 취소
export async function cancelReservation(
  reservationId: string,
  data: {
    canceledAt: Date;
    canceledBy: UserRole;
    cancelNote?: string;
  },
) {
  return prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.CANCELED,
      canceledAt: data.canceledAt,
      canceledBy: data.canceledBy,
      cancelNote: data.cancelNote || null,
    },
  });
}

// 예약 완료 처리
export async function completeReservation(
  reservationId: string,
  completedAt: Date,
) {
  return prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.COMPLETED,
      completedAt,
    },
  });
}

// 다수 예약 일괄 취소 (클래스 변경/삭제시)
export async function cancelManyReservations(
  reservationIds: string[],
  data: {
    canceledAt: Date;
    canceledBy: UserRole;
    cancelNote: string;
  },
) {
  return prisma.reservation.updateMany({
    where: {
      id: {
        in: reservationIds,
      },
    },
    data: {
      status: ReservationStatus.CANCELED,
      canceledAt: data.canceledAt,
      canceledBy: data.canceledBy,
      cancelNote: data.cancelNote,
    },
  });
}

// 통계 관련
// 기간별 예약 통계
export async function getReservationStats(params: {
  startDate: Date;
  endDate: Date;
}) {
  const where = {
    createdAt: {
      gte: params.startDate,
      lte: params.endDate,
    },
  };

  const [totalCount, statusBreakdown, revenue, refund] = await Promise.all([
    // 총 예약 수
    prisma.reservation.count({ where }),

    // 상태별 통계
    prisma.reservation.groupBy({
      by: ["status"],
      _count: true,
      where,
    }),

    // 총 매출
    prisma.reservation.aggregate({
      _sum: {
        paidPoints: true,
      },
      where: {
        ...where,
        status: {
          in: [ReservationStatus.BOOKED, ReservationStatus.COMPLETED],
        },
      },
    }),

    // 환불 금액
    prisma.reservation.aggregate({
      _sum: {
        paidPoints: true,
      },
      where: {
        ...where,
        status: ReservationStatus.CANCELED,
      },
    }),
  ]);

  return {
    totalCount,
    statusBreakdown,
    totalRevenue: revenue._sum.paidPoints || 0,
    totalRefund: refund._sum.paidPoints || 0,
  };
}

// 일별 예약 수 조회
export async function getDailyReservationCounts(params: {
  startDate: Date;
  endDate: Date;
}) {
  const result = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM reservations
    WHERE created_at >= ${params.startDate} AND created_at <= ${params.endDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  return result.map((row) => ({
    date: row.date.toISOString().split("T")[0],
    count: Number(row.count),
  }));
}

// 포인트 내역 생성
export async function createPointHistory(
  data: Prisma.PointHistoryUncheckedCreateInput,
) {
  return prisma.pointHistory.create({ data });
}

// 유저 조회 (포인트 잔액 확인용)
export async function findUserWithPoint(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      pointBalance: true,
    },
  });
}

// 유저 포인트 차감
export async function decrementUserPoint(userId: string, amount: number) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      pointBalance: {
        decrement: amount,
      },
    },
  });
}

// 유저 포인트 증가
export async function incrementUserPoint(userId: string, amount: number) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      pointBalance: {
        increment: amount,
      },
    },
  });
}

// 유저 쿠폰 조회 (사용 가능 여부 확인)
export async function findUserCouponById(userCouponId: string) {
  return prisma.userCoupon.findUnique({
    where: { id: userCouponId },
    include: { template: true },
  });
}

// 쿠폰 사용 처리
export async function useUserCoupon(userCouponId: string, usedAt: Date) {
  return prisma.userCoupon.update({
    where: { id: userCouponId },
    data: { usedAt },
  });
}

// 슬롯 조회
export async function findSlotWithClass(slotId: string) {
  return prisma.classSlot.findFirst({
    where: {
      id: slotId,
      deletedAt: null,
      class: {
        deletedAt: null,
      },
    },
    include: {
      class: {
        include: {
          center: true,
        },
      },
      _count: {
        select: {
          reservations: {
            where: {
              status: ReservationStatus.BOOKED,
            },
          },
        },
      },
    },
  });
}

// 슬롯 예약 카운트 증가
export async function increaseSlotCurrentReservation(
  tx: Prisma.TransactionClient,
  slotId: string,
) {
  return tx.classSlot.update({
    where: { id: slotId },
    data: {
      currentReservation: {
        increment: 1,
      },
    },
  });
}

// 센터 조회

// 소유자 ID로 센터 조회
export async function findCenterByOwnerId(ownerId: string) {
  return prisma.center.findUnique({
    where: { ownerId },
    select: {
      id: true,
      ownerId: true,
      name: true,
    },
  });
}
