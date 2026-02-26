import { PointUsed } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { PaginationResponse } from "../../types/common.types.ts";
import { AppError } from "../../middlewares/errorHandler.ts";
import * as pointRepository from "./point.repository.ts";
import type {
  ChargePointInput,
  ChargeConfirmInput,
  AdjustPointInput,
  QueryMyPointHistoryInput,
  QueryAdminPointHistoryInput,
  QuerySellerSettlementInput,
  QuerySellerTransactionsInput,
} from "./point.validation.ts";
import { env } from "../../config/env.ts";


// 포인트 사용 (예약 생성 시 호출)
export async function usePoints(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  balanceBefore: number,
  reservationId: string,
) {
  if (amount <= 0) return;

  await pointRepository.decrementUserPoint(tx, userId, amount);

  await pointRepository.createPointHistory(tx, {
    userId,
    type: PointUsed.USE,
    amount,
    balanceBefore,
    balanceAfter: balanceBefore - amount,
    reservationId,
  });
}

// 포인트 환불 (예약 취소 시 호출)
export async function refundPoints(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  balanceBefore: number,
  reservationId: string,
) {
  if (amount <= 0) return;

  await pointRepository.incrementUserPoint(tx, userId, amount);

  await pointRepository.createPointHistory(tx, {
    userId,
    type: PointUsed.REFUND,
    amount,
    balanceBefore,
    balanceAfter: balanceBefore + amount,
    reservationId,
  });
}

// [고객] 내 포인트 잔액 조회
export async function getMyBalance(userId: string) {
  const user = await pointRepository.findUserById(userId);
  if (!user) {
    throw new AppError(404, "유저를 찾을 수 없습니다", "USER_NOT_FOUND");
  }
  return { pointBalance: user.pointBalance };
}

// [고객] 내 포인트 내역 조회
export async function getMyPointHistory(
  userId: string,
  query: QueryMyPointHistoryInput,
): Promise<PaginationResponse<any>> {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const { type } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.PointHistoryWhereInput = { userId };
  if (type) where.type = type as PointUsed;

  const [items, total] = await Promise.all([
    pointRepository.findPointHistories({ where, skip, take: limit }),
    pointRepository.countPointHistories(where),
  ]);

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// [고객] 포인트 충전
export async function chargePoints(userId: string, data: ChargePointInput) {
  // paymentKey 중복 체크
  if (data.paymentKey) {
    const existing = await pointRepository.findByPaymentKey(data.paymentKey);
    if (existing) {
      throw new AppError(409, "이미 처리된 결제입니다", "DUPLICATE_PAYMENT");
    }
  }

  const user = await pointRepository.findUserById(userId);
  if (!user) {
    throw new AppError(404, "유저를 찾을 수 없습니다", "USER_NOT_FOUND");
  }

  const result = await pointRepository.executeTransaction(async (tx) => {
    await pointRepository.incrementUserPoint(tx, userId, data.amount);

    const history = await pointRepository.createPointHistory(tx, {
      userId,
      type: PointUsed.CHARGE,
      amount: data.amount,
      balanceBefore: user.pointBalance,
      balanceAfter: user.pointBalance + data.amount,
      paymentKey: data.paymentKey || null,
      orderId: data.orderId || null,
    });

    return history;
  });

  return {
    pointHistory: result,
    balanceAfter: user.pointBalance + data.amount,
  };
}

// [고객] 토스페이먼츠 결제 승인 API 호출. 실패 시 AppError.
async function confirmTossPayment(paymentKey: string, orderId: string, amount: number) {
  const secretKey = env.TOSS_PAYMENTS_SECRET_KEY;
  if (!secretKey) {
    throw new AppError(
      503,
      "결제 서비스 설정이 되어 있지 않습니다. (TOSS_PAYMENTS_SECRET_KEY)",
      "TOSS_NOT_CONFIGURED",
    );
  }
  const authHeader = "Basic " + Buffer.from(secretKey + ":").toString("base64");

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const data = (await res.json()) as { message?: string; code?: string };
  if (!res.ok) {
    throw new AppError(
      res.status,
      data.message || "결제 승인에 실패했습니다.",
      data.code || "TOSS_CONFIRM_FAILED",
    );
  }
}

// [고객] 토스 승인 + 포인트 충전 
export async function chargePointsWithConfirm(userId: string, data: ChargeConfirmInput) {
  await confirmTossPayment(data.paymentKey, data.orderId, data.amount);
  return chargePoints(userId, {
    amount: data.amount,
    paymentKey: data.paymentKey,
    orderId: data.orderId,
  });
}

function getMonthRange(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

// [판매자] 매출 정산 요약 + 클래스별 매출
export async function getSellerSettlement(
  sellerId: string,
  query: QuerySellerSettlementInput,
) {
  // 1. 판매자의 센터 조회
  const center = await pointRepository.findCenterByOwnerId(sellerId);
  if (!center) {
    throw new AppError(404, "센터 정보를 찾을 수 없습니다", "CENTER_NOT_FOUND");
  }

  const year = Number(query.year);
  const month = Number(query.month);
  const { startDate, endDate } = getMonthRange(year, month);

  // 2. 정산 요약 + 클래스별 매출 병렬 조회
  const [summary, byClass] = await Promise.all([
    pointRepository.getSettlementSummary({
      centerId: center.id,
      startDate,
      endDate,
    }),
    pointRepository.getSettlementByClass({
      centerId: center.id,
      startDate,
      endDate,
    }),
  ]);

  return {
    period: {
      year,
      month,
    },
    summary,
    byClass,
  };
}

// [판매자] 거래 내역 조회
export async function getSellerTransactions(
  sellerId: string,
  query: QuerySellerTransactionsInput,
): Promise<PaginationResponse<any>> {
  // 1. 판매자의 센터 조회
  const center = await pointRepository.findCenterByOwnerId(sellerId);
  if (!center) {
    throw new AppError(404, "센터 정보를 찾을 수 없습니다", "CENTER_NOT_FOUND");
  }

  const year = Number(query.year);
  const month = Number(query.month);
  const { startDate, endDate } = getMonthRange(year, month);
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const { items, total } = await pointRepository.getSettlementTransactions({
    centerId: center.id,
    startDate,
    endDate,
    ...(query.classId ? { classId: query.classId } : {}),
    skip,
    take: limit,
  });

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// [관리자] 포인트 지급/회수
export async function adjustPoints(data: AdjustPointInput) {
  const user = await pointRepository.findUserById(data.userId);
  if (!user) {
    throw new AppError(404, "유저를 찾을 수 없습니다", "USER_NOT_FOUND");
  }

  // 회수 시 잔액 부족 체크
  if (data.amount < 0 && user.pointBalance + data.amount < 0) {
    throw new AppError(
      400,
      "유저의 포인트 잔액이 부족합니다",
      "INSUFFICIENT_POINTS",
    );
  }

  const result = await pointRepository.executeTransaction(async (tx) => {
    if (data.amount > 0) {
      await pointRepository.incrementUserPoint(tx, data.userId, data.amount);
    } else {
      await pointRepository.decrementUserPoint(
        tx,
        data.userId,
        Math.abs(data.amount),
      );
    }

    const history = await pointRepository.createPointHistory(tx, {
      userId: data.userId,
      type: PointUsed.ADMIN,
      amount: Math.abs(data.amount),
      balanceBefore: user.pointBalance,
      balanceAfter: user.pointBalance + data.amount,
      memo: data.memo,
    });

    return history;
  });

  return {
    pointHistory: result,
    balanceAfter: user.pointBalance + data.amount,
  };
}

// [관리자] 전체 포인트 내역 조회
export async function getAdminPointHistory(
  query: QueryAdminPointHistoryInput,
): Promise<PaginationResponse<any>> {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const { type, userId } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.PointHistoryWhereInput = {};
  if (type) where.type = type as PointUsed;
  if (userId) where.userId = userId;

  const [items, total] = await Promise.all([
    pointRepository.findPointHistories({ where, skip, take: limit }),
    pointRepository.countPointHistories(where),
  ]);

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
