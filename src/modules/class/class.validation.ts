import { z } from "zod";
import { ClassStatus } from "@prisma/client";

const imageUrlSchema = z.url({ error: "올바른 URL 형식이어야 합니다" });
export const CLASS_LEVELS = ["입문", "초급", "중급", "고급"] as const;

const scheduleObjectSchema = z.object({
  monday: z.string().nullable().optional(),
  tuesday: z.string().nullable().optional(),
  wednesday: z.string().nullable().optional(),
  thursday: z.string().nullable().optional(),
  friday: z.string().nullable().optional(),
  saturday: z.string().nullable().optional(),
  sunday: z.string().nullable().optional(),
});

// 클래스 생성
export const createClassSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "클래스명은 필수입니다")
      .max(30, "클래스명은 30자 이하여야 합니다"),
    category: z.string(),
    level: z.enum(CLASS_LEVELS, {
      message: `난이도는 ${CLASS_LEVELS.join(", ")} 중 하나여야 합니다`,
    }),
    description: z
      .string()
      .max(2000, "상세 설명은 2000자 이하여야 합니다")
      .exactOptional(),
    notice: z
      .string()
      .max(1000, "주의사항은 1000자 이하여야 합니다")
      .exactOptional(),
    pricePoints: z.coerce
      .number()
      .int("포인트는 정수여야 합니다")
      .min(0, "포인트는 0 이상이어야 합니다"),
    capacity: z.coerce
      .number()
      .int("정원은 정수여야 합니다")
      .min(1, "정원은 1명 이상이어야 합니다")
      .max(100, "정원은 100명 이하여야 합니다"),
    schedule: z
      .string()
      .optional()
      .transform((str, ctx) => {
        if (!str) return undefined;
        try {
          const parsed = JSON.parse(str);
          const result = scheduleObjectSchema.safeParse(parsed);
          if (!result.success) {
            ctx.addIssue({
              code: "custom",
              message: "올바른 스케줄 형식이 아닙니다",
            });
            return z.NEVER;
          }
          return parsed;
        } catch (error) {
          ctx.addIssue({
            code: "custom",
            message: "올바른 JSON 형식이 아닙니다",
          });
          return z.NEVER;
        }
      }),
  }),
});

// 클래스 수정
export const updateClassSchema = z.object({
  body: createClassSchema.shape.body.partial(),
});

// 클래스 목록 조회 필터
export const queryClassSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    level: z.enum(CLASS_LEVELS).optional(),
    status: z
      .enum(Object.values(ClassStatus) as [string, ...string[]])
      .optional(),
    centerId: z.string().min(1, "올바른 센터 ID가 아닙니다").optional(),
    search: z.string().optional(),
    searchType: z.enum(["className", "centerName"]).optional(),
    sort: z.enum(["latest", "popularity"]).optional().default("latest"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
});

// 클래스 승인
export const approveClassSchema = z.object({
  body: z.object({}),
});

// 클래스 반려
export const rejectClassSchema = z.object({
  body: z.object({
    rejectReason: z
      .string()
      .min(1, "반려 사유는 필수입니다")
      .max(500, "반려 사유는 500자 이하여야 합니다"),
  }),
});

// 슬롯 생성
export const createSlotSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 필요합니다"),
    hour: z.coerce.number().int().min(0).max(23, "시간은 0-23 사이여야 합니다"),
    capacity: z.coerce.number().int().min(1).max(100),
    isOpen: z.boolean().default(true),
  }),
});

// 슬롯 수정
export const updateSlotSchema = z.object({
  body: z.object({
    isOpen: z.boolean(),
  }),
});

// 스케줄 기반 슬롯 자동 생성
export const generateSlotsSchema = z.object({
  body: z
    .object({
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
    })
    .refine(
      (data) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
      },
      {
        message: "시작 날짜는 종료 날짜보다 이전이어야 합니다",
      },
    ),
});

// 타입 추론
export type CreateClassInput = z.infer<typeof createClassSchema>["body"];
export type UpdateClassInput = z.infer<typeof updateClassSchema>["body"];
export type QueryClassInput = z.infer<typeof queryClassSchema>["query"];
export type ApproveClassInput = z.infer<typeof approveClassSchema>["body"];
export type RejectClassInput = z.infer<typeof rejectClassSchema>["body"];
export type CreateSlotInput = z.infer<typeof createSlotSchema>["body"];
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>["body"];
export type GenerateSlotsInput = z.infer<typeof generateSlotsSchema>["body"];
