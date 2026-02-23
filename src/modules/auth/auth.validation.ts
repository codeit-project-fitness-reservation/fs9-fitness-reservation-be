import { z } from 'zod';

const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => /^\d{11}$/.test(v), {
    error: '전화번호는 숫자 11자리여야 합니다',
  });

export const signUpSchema = z.object({
  body: z.object({
    email: z.email({ error: '올바른 이메일 형식이어야 합니다' }),
    password: z.string().min(8, { error: '비밀번호는 8자 이상이어야 합니다' }),
    nickname: z.string().min(2, { error: '닉네임은 2자 이상이어야 합니다' }),
    phone: phoneSchema,
    role: z.enum(['CUSTOMER', 'SELLER']).optional().default('CUSTOMER'),
    center: z.object({
      name: z.string().min(1, '센터명은 필수입니다').max(100),
      address1: z.string().min(1, '도로명 주소는 필수입니다'),
      address2: z.string().optional(),
    }).optional(),
  }).refine(
    (data) => data.role !== 'SELLER' || !!data.center,
    { error: '판매자는 센터 정보를 입력해야 합니다', path: ['center'] }
  ),
});

export const signInSchema = z.object({
  body: z.object({
    email: z.email({ error: '올바른 이메일 형식이어야 합니다' }),
    password: z.string().min(8, { error: '비밀번호는 8자 이상이어야 합니다' }),
  }),
});

// 고객 프로필 수정 스키마
export const updateCustomerSchema = z.object({
  body: z.object({
    nickname: z.string().min(2, { error: '닉네임은 2자 이상이어야 합니다' }).optional(),
    phone: phoneSchema.optional(),
    password: z.string().min(8, { error: '비밀번호는 8자 이상이어야 합니다' }).optional(),
    passwordConfirm: z.string().optional(),
    introduction: z.string().max(200, { error: '자기소개는 200자 이내여야 합니다' }).optional(),
  }).refine((data) => {
    if (data.password) {
      return !!data.passwordConfirm && data.password === data.passwordConfirm;
    }
    return true;
  }, {
    error: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  }),
});

// 판매자 프로필 수정 스키마 (센터 정보 포함)
export const updateSellerSchema = z.object({
  body: z.object({
    nickname: z.string().min(2, { error: '닉네임은 2자 이상이어야 합니다' }).optional(),
    phone: phoneSchema.optional(),
    password: z.string().min(8, { error: '비밀번호는 8자 이상이어야 합니다' }).optional(),
    passwordConfirm: z.string().optional(),
    
    // 센터 정보
    centerName: z.string().min(1, { error: '센터명은 필수입니다' }).max(100).optional(),
    address1: z.string().min(1, { error: '도로명 주소는 필수입니다' }).optional(),
    address2: z.string().optional(),
    introduction: z.string().max(2000, { error: '업체 소개는 2000자 이내여야 합니다' }).optional(),
  }).refine((data) => {
    if (data.password) {
      return !!data.passwordConfirm && data.password === data.passwordConfirm;
    }
    return true;
  }, {
    error: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>['body'];
export type SignInInput = z.infer<typeof signInSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
export type UpdateSellerInput = z.infer<typeof updateSellerSchema>['body'];