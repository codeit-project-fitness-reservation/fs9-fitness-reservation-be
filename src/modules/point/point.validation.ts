import { z } from "zod";

// [고객] 포인트 충전
const chargePointBodySchema = z.object({
  amount: z.number().int().min(1, "충전 금액은 1 이상이어야 합니다"),
  paymentKey: z.string().min(1, "결제 키가 필요합니다").optional(),
  orderId: z.string().min(1, "주문 ID가 필요합니다").optional(),
});
export const chargePointSchema = z.object({ body: chargePointBodySchema });
export type ChargePointInput = z.infer<typeof chargePointBodySchema>;

// [고객] 포인트 내역 조회
const queryMyPointHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(["CHARGE", "USE", "REFUND", "ADMIN"]).optional(),
});
export const queryMyPointHistorySchema = z.object({ query: queryMyPointHistoryQuerySchema });
export type QueryMyPointHistoryInput = z.infer<typeof queryMyPointHistoryQuerySchema>;

// [판매자] 매출 정산 요약 + 클래스별 매출 조회
const querySellerSettlementQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
export const querySellerSettlementSchema = z.object({ query: querySellerSettlementQuerySchema });
export type QuerySellerSettlementInput = z.infer<typeof querySellerSettlementQuerySchema>;

// [판매자] 거래 내역 조회
const querySellerTransactionsQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  classId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const querySellerTransactionsSchema = z.object({ query: querySellerTransactionsQuerySchema });
export type QuerySellerTransactionsInput = z.infer<typeof querySellerTransactionsQuerySchema>;

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
const queryAdminPointHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(["CHARGE", "USE", "REFUND", "ADMIN"]).optional(),
  userId: z.string().optional(),
});
export const queryAdminPointHistorySchema = z.object({ query: queryAdminPointHistoryQuerySchema });
export type QueryAdminPointHistoryInput = z.infer<typeof queryAdminPointHistoryQuerySchema>;
