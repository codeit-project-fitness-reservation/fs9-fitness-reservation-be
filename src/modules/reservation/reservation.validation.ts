import { z } from "zod";

const reservationStatusEnum = z.enum(["BOOKED", "CANCELED", "COMPLETED"]);

// 예약 생성 (userCouponId: 내 쿠폰함 UserCoupon id. couponId는 FE 호환용 별칭)
const createReservationBodySchema = z.object({
  slotId: z.cuid(),
  userCouponId: z.cuid().optional(),
  couponId: z.cuid().optional(),
});
export const createReservationSchema = z.object({
  body: createReservationBodySchema,
});

// 예약 취소
const cancelReservationBodySchema = z.object({
  cancelNote: z.string().optional(),
});
export const cancelReservationSchema = z.object({
  body: cancelReservationBodySchema,
});

// 예약 조회
const queryReservationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  userId: z.cuid().optional(),
  classId: z.cuid().optional(),
  slotId: z.cuid().optional(),
  status: reservationStatusEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  keyword: z.string().optional(),
  searchType: z.enum(["User", "Class", "Center"]).optional(),
});
export const queryReservationSchema = z.object({
  query: queryReservationQuerySchema,
});

// 판매자 슬롯 조회
const querySellerSlotsQuerySchema = z.object({
  startDate: z.string().min(1, "시작일은 필수입니다"),
  endDate: z.string().min(1, "종료일은 필수입니다"),
  classId: z.cuid().optional(),
});
export const querySellerSlotsSchema = z.object({
  query: querySellerSlotsQuerySchema,
});

// 관리자 통계 조회
export const queryReservationStatsSchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// 타입
export type CreateReservationInput = z.infer<
  typeof createReservationBodySchema
>;
export type CancelReservationInput = z.infer<
  typeof cancelReservationBodySchema
>;
export type QueryReservationInput = z.infer<typeof queryReservationQuerySchema>;
export type QuerySellerSlotsInput = z.infer<typeof querySellerSlotsQuerySchema>;
export type QueryReservationStatsInput = z.infer<
  typeof queryReservationStatsSchema
>["query"];
