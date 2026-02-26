import { z } from "zod";

// 센터 생성
export const createCenterSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "센터명은 필수입니다")
      .max(100, "센터명은 100자 이내로 입력해주세요"),
    address1: z.string().min(1, "도로명 주소는 필수입니다"),
    address2: z.string().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
});

// 센터 수정
export const updateCenterSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    introduction: z.string().max(2000).optional(),
    businessHours: z.any().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
});

// 센터 목록 조회
export const queryCenterSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    sort: z.enum(["latest", "name"]).optional().default("latest"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
});

// 타입 추출
export type CreateCenterInput = z.infer<typeof createCenterSchema>["body"];
export type UpdateCenterInput = z.infer<typeof updateCenterSchema>["body"];
export type QueryCenterInput = z.infer<typeof queryCenterSchema>["query"];
