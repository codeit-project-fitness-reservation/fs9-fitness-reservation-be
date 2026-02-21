import { z } from "zod";

// [고객] 포인트 충전
export const chargePointSchema = z.object({
  amount: z.number().int().min(1, "충전 금액은 1 이상이어야 합니다"),
  paymentKey: z.string().min(1, "결제 키가 필요합니다").optional(),
  orderId: z.string().min(1, "주문 ID가 필요합니다").optional(),
});
export type ChargePointInput = z.infer<typeof chargePointSchema>;

// [고객] 포인트 내역 조회
export const queryMyPointHistorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(["CHARGE", "USE", "REFUND", "ADMIN"]).optional(),
});
export type QueryMyPointHistoryInput = z.infer<typeof queryMyPointHistorySchema>;

// [판매자] 매출 정산 요약 + 클래스별 매출 조회
export const querySellerSettlementSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
export type QuerySellerSettlementInput = z.infer<typeof querySellerSettlementSchema>;

// [판매자] 거래 내역 조회
export const querySellerTransactionsSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  classId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type QuerySellerTransactionsInput = z.infer<typeof querySellerTransactionsSchema>;

// [관리자] 포인트 지급/회수
export const adjustPointSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "유저 ID가 필요합니다"),
    amount: z.number().int().refine((val) => val !== 0, {
      message: "금액은 0이 아니어야 합니다",
    }),
    memo: z.string().min(1, "사유를 입력해주세요"),
  }),
});
export type AdjustPointInput = z.infer<typeof adjustPointSchema>["body"];


// [관리자] 전체 포인트 내역 조회
export const queryAdminPointHistorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(["CHARGE", "USE", "REFUND", "ADMIN"]).optional(),
  userId: z.string().optional(),
});
export type QueryAdminPointHistoryInput = z.infer<typeof queryAdminPointHistorySchema>;
