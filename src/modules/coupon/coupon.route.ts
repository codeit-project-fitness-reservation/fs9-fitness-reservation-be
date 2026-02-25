import { Router } from "express";
import { authenticate } from "../../middlewares/auth.ts";
import * as couponController from "./coupon.controller.ts";

const router = Router();

// 쿠폰 템플릿 생성
router.post("/", authenticate, couponController.createCoupon);

// 쿠폰 지급
router.post("/give", authenticate, couponController.giveCoupon);

// [고객] 내 쿠폰함 조회
router.get("/me", authenticate, couponController.getMyUserCoupons);

// 특정 유저의 쿠폰함 조회
router.get("/user/:userId", authenticate, couponController.getUserCoupons);

// 내가 만든 쿠폰 목록 조회
router.get("/", authenticate, couponController.getMyCoupons);

// 쿠폰 수정
router.put("/:id", authenticate, couponController.updateCoupon);

// 쿠폰 삭제
router.delete("/:id", authenticate, couponController.deleteCoupon);

export default router;
