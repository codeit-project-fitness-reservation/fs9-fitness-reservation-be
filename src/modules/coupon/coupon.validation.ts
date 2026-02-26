import { z } from "zod";

// 쿠폰 템플릿 생성 스키마
export const createCouponTemplateSchema = z.object({
  name: z.string().min(1, "쿠폰 이름을 입력해주세요"),
  
  // 할인 타입 (AMOUNT: 금액 할인, PERCENTAGE: 비율 할인)
  discountType: z.enum(["AMOUNT", "PERCENTAGE"]),
  
  // 할인 값 (금액 또는 퍼센트)
  usageValue: z.number().int().min(1, "할인 값을 입력해주세요"),

  // 만료일
  expiresAt: z.coerce.date(),
});

export type CreateCouponTemplateInput = z.infer<typeof createCouponTemplateSchema>;

// 쿠폰 지급 스키마
export const giveCouponSchema = z.object({
  userId: z.string().min(1, "지급 대상 유저 ID가 필요합니다"),
  templateId: z.string().min(1, "쿠폰 템플릿 ID가 필요합니다"),
});

export type GiveCouponInput = z.infer<typeof giveCouponSchema>;

// 쿠폰 템플릿 수정 스키마
export const updateCouponTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  discountType: z.enum(["AMOUNT", "PERCENTAGE"]).optional(),
  usageValue: z.number().int().min(1).optional(),
  expiresAt: z.coerce.date().optional(),
});

export type UpdateCouponTemplateInput = z.infer<typeof updateCouponTemplateSchema>;
