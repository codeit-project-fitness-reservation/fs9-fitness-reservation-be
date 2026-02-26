import { z } from "zod";

// 유저 목록 조회
export const getUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    role: z.enum(["CUSTOMER", "SELLER", "ADMIN"]).optional(),
    searchType: z.enum(["nickname", "email", "phone"]).optional(),
    search: z.string().optional(),
  }),
});

export type GetUsersSchema = z.infer<typeof getUsersSchema>;

// 프로필 수정
export const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  phone: z.string().min(1).max(20).optional(),
  password: z.string().min(8).max(100).optional(),
  introduction: z.string().max(500).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// [관리자] 회원 메모 수정
export const patchUserNoteSchema = z.object({
  body: z.object({
    note: z.string().max(500).nullable().optional(),
  }),
});
export type PatchUserNoteSchema = z.infer<typeof patchUserNoteSchema>;
