import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.ts';
import { validate } from '../../middlewares/validate.ts';
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getUserByIdHandler,
  updateCustomerHandler,
  updateSellerHandler,
} from './auth.controller.ts';
import { signUpSchema, updateCustomerSchema, updateSellerSchema, signInSchema } from './auth.validation.ts';

import { uploadProfileImage } from '../../middlewares/upload.ts';

const router = Router();

// POST /auth/signup - 회원가입
router.post('/signup', uploadProfileImage, validate(signUpSchema), signupHandler);

// POST /auth/login - 로그인
router.post('/login', validate(signInSchema), loginHandler);

// POST /auth/refresh - 토큰 갱신(쿠키 기반)
router.post('/refresh', refreshHandler);

// POST /auth/logout - 로그아웃(쿠키 제거)
router.post('/logout', logoutHandler);

// GET /auth/me - 유저 정보 조회
router.get('/me', authenticate, getUserByIdHandler);

// PUT /auth/me - 유저 정보 수정
// PUT /auth/customer/me - 고객 프로필 수정
router.put(
  '/customer/me', 
  authenticate, 
  requireRole('CUSTOMER'), 
  uploadProfileImage, 
  validate(updateCustomerSchema), 
  updateCustomerHandler
);

// PUT /auth/seller/me - 판매자 프로필 수정 (센터 정보 포함)
router.put(
  '/seller/me', 
  authenticate, 
  requireRole('SELLER'), 
  uploadProfileImage, 
  validate(updateSellerSchema), 
  updateSellerHandler
);


export default router;