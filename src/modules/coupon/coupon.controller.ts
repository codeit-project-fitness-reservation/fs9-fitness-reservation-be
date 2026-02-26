import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import type { AuthRequest } from "../../middlewares/auth.ts";
import { AppError } from "../../middlewares/errorHandler.ts";
import { createCouponTemplateSchema, giveCouponSchema, updateCouponTemplateSchema } from "./coupon.validation.ts";
import * as couponService from "./coupon.service.ts";

// 쿠폰 템플릿 생성
export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: issuerId, role } = (req as AuthRequest).user;

    if (role !== UserRole.ADMIN && role !== UserRole.SELLER) {
      throw new AppError(403, "권한이 없습니다.", "FORBIDDEN");
    }

    const input = createCouponTemplateSchema.parse(req.body);
    const coupon = await couponService.createCouponTemplate(issuerId, role, input);

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

// 내가 만든 쿠폰 목록 조회
export const getMyCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: issuerId } = (req as AuthRequest).user;
    const coupons = await couponService.getMyTemplates(issuerId);

    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};

// 쿠폰 지급
export const giveCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: issuerId } = (req as AuthRequest).user;
    const input = giveCouponSchema.parse(req.body);

    const result = await couponService.giveCoupon(issuerId, input);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// 쿠폰 템플릿 수정
export const updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: issuerId, role } = (req as AuthRequest).user;
    const { id } = req.params;

    if (role !== UserRole.ADMIN && role !== UserRole.SELLER) {
      throw new AppError(403, "권한이 없습니다.", "FORBIDDEN");
    }

    const input = updateCouponTemplateSchema.parse(req.body);
    const result = await couponService.updateCouponTemplate(issuerId, id as string, input);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// 쿠폰 템플릿 삭제
export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: issuerId, role } = (req as AuthRequest).user;
    const { id } = req.params;

    if (role !== UserRole.ADMIN && role !== UserRole.SELLER) {
      throw new AppError(403, "권한이 없습니다.", "FORBIDDEN");
    }

    await couponService.deleteCouponTemplate(issuerId, id as string);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

// [고객] 내 쿠폰함 조회 (로그인한 유저 본인)
export const getMyUserCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: userId } = (req as AuthRequest).user;
    const coupons = await couponService.getUserCoupons(userId);
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};

// 특정 유저의 쿠폰함 조회
export const getUserCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { id: requesterId, role } = (req as AuthRequest).user;

    if (role !== UserRole.ADMIN && requesterId !== userId) {
      throw new AppError(403, "접근 권한이 없습니다.", "FORBIDDEN");
    }

    const coupons = await couponService.getUserCoupons(userId as string);
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};
