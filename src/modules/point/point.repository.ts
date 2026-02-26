import prisma from "../../config/prisma.ts";
import { ReservationStatus } from "@prisma/client";
import type { Prisma, PointUsed } from "@prisma/client";

// [고객] 유저 조회 (포인트 잔액 확인용)
export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      pointBalance: true,
    },
  });
}

// [고객] 유저 포인트 증가 (충전, 환불)
export async function incrementUserPoint(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
) {
  return tx.user.update({
    where: { id: userId },
    data: {
      pointBalance: { increment: amount },
    },
  });
}

// [고객] 유저 포인트 차감 (사용)
export async function decrementUserPoint(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
) {
  return tx.user.update({
    where: { id: userId },
    data: {
      pointBalance: { decrement: amount },
    },
  });
}

// [고객] 포인트 내역 생성
export async function createPointHistory(
  tx: Prisma.TransactionClient,
  data: Prisma.PointHistoryUncheckedCreateInput,
) {
  return tx.pointHistory.create({ data });
}

// [고객] 포인트 내역 목록 조회 (페이지네이션)
export async function findPointHistories(params: {
  where: Prisma.PointHistoryWhereInput;
  skip: number;
  take: number;
}) {
  return prisma.pointHistory.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: { createdAt: "desc" },
    include: {
      reservation: {
        select: {
          id: true,
          class: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
}

// [고객] 포인트 내역 개수 조회
export async function countPointHistories(
  where: Prisma.PointHistoryWhereInput,
) {
  return prisma.pointHistory.count({ where });
}

// [고객] paymentKey 중복 체크
export async function findByPaymentKey(paymentKey: string) {
  return prisma.pointHistory.findUnique({
    where: { paymentKey },
  });
}

// [고객] 트랜잭션 실행
export async function executeTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}

// [판매자] 소유자의 센터 조회
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

// [판매자] 매출 정산 요약 (총 매출, 쿠폰 할인, 환불/취소, 순매출)
export async function getSettlementSummary(params: {
  centerId: string;
  startDate: Date;
  endDate: Date;
}) {
  const baseWhere = {
    class: { centerId: params.centerId },
    createdAt: { gte: params.startDate, lte: params.endDate },
  };

  const [revenue, refund] = await Promise.all([
    // 총 매출 + 쿠폰 할인 (BOOKED + COMPLETED)
    prisma.reservation.aggregate({
      _sum: {
        paidPoints: true,
        couponDiscountPoints: true,
        pricePoints: true,
      },
      where: {
        ...baseWhere,
        status: {
          in: [ReservationStatus.BOOKED, ReservationStatus.COMPLETED],
        },
      },
    }),

    // 환불/취소 금액
    prisma.reservation.aggregate({
      _sum: {
        paidPoints: true,
      },
      where: {
        ...baseWhere,
        status: ReservationStatus.CANCELED,
      },
    }),
  ]);

  const totalRevenue = revenue._sum.pricePoints || 0;
  const couponDiscount = revenue._sum.couponDiscountPoints || 0;
  const refundAmount = refund._sum.paidPoints || 0;
  const netRevenue = totalRevenue - couponDiscount - refundAmount;

  return {
    totalRevenue,
    couponDiscount,
    refundAmount,
    netRevenue,
  };
}

// [판매자] 클래스별 매출
export async function getSettlementByClass(params: {
  centerId: string;
  startDate: Date;
  endDate: Date;
}) {
  const classes = await prisma.class.findMany({
    where: { centerId: params.centerId },
    select: {
      id: true,
      title: true,
      bannerUrl: true,
      reservations: {
        where: {
          createdAt: { gte: params.startDate, lte: params.endDate },
          status: {
            in: [ReservationStatus.BOOKED, ReservationStatus.COMPLETED],
          },
        },
        select: {
          pricePoints: true,
        },
      },
    },
  });

  return classes
    .map((cls) => ({
      classId: cls.id,
      classTitle: cls.title,
      bannerUrl: cls.bannerUrl,
      totalRevenue: cls.reservations.reduce((sum, r) => sum + r.pricePoints, 0),
    }))
    .filter((cls) => cls.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// [판매자] 거래 내역 조회 (PointHistory 기반)
export async function getSettlementTransactions(params: {
  centerId: string;
  startDate: Date;
  endDate: Date;
  classId?: string;
  skip: number;
  take: number;
}) {
  const where: Prisma.PointHistoryWhereInput = {
    type: { in: ["USE", "REFUND"] },
    createdAt: { gte: params.startDate, lte: params.endDate },
    reservation: {
      class: {
        centerId: params.centerId,
        ...(params.classId && { id: params.classId }),
      },
    },
  };

  const [items, total] = await Promise.all([
    prisma.pointHistory.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
      include: {
        reservation: {
          select: {
            id: true,
            status: true,
            class: {
              select: {
                id: true,
                title: true,
                bannerUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.pointHistory.count({ where }),
  ]);

  return { items, total };
}
