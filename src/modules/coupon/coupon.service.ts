import { UserRole } from "@prisma/client";
import * as couponRepo from "./coupon.repository.ts";
import type {
  CreateCouponTemplateInput,
  GiveCouponInput,
  UpdateCouponTemplateInput,
} from "./coupon.validation.ts";
import { findUserById } from "../user/user.repository.ts";
import { AppError } from "../../middlewares/errorHandler.ts";

// 쿠폰 템플릿 생성
export const createCouponTemplate = async (
  issuerId: string,
  userRole: UserRole,
  input: CreateCouponTemplateInput,
) => {
  let centerId: string | null = null;

  // 판매자인 경우 자신의 센터 ID를 자동으로 할당
  if (userRole === UserRole.SELLER) {
    const seller = await findUserById(issuerId);
    if (!seller || !seller.center) {
      throw new AppError(404, "센터 정보를 찾을 수 없습니다.", "CENTER_NOT_FOUND");
    }
    centerId = seller.center.id;
  }

  // 만료일 체크
  if (new Date(input.expiresAt) < new Date()) {
    throw new AppError(400, "만료일은 현재 시간 이후여야 합니다.", "INVALID_EXPIRES_AT");
  }

  const { discountType, usageValue, ...rest } = input;

  // 할인 타입에 따라 필드 매핑
  const discountPoints = discountType === "AMOUNT" ? usageValue : null;
  const discountPercentage = discountType === "PERCENTAGE" ? usageValue : null;

  // 비율 할인 유효성 검사 (0~100%)
  if (discountPercentage !== null && (discountPercentage < 0 || discountPercentage > 100)) {
    throw new AppError(400, "할인율은 0%에서 100% 사이여야 합니다.", "INVALID_DISCOUNT_PERCENTAGE");
  }

  return await couponRepo.createTemplate({
    ...rest,
    discountPoints,
    discountPercentage,
    issuerId,
    centerId,
  });
};

// 내가 생성한 쿠폰 목록 조회
export const getMyTemplates = async (issuerId: string) => {
  return await couponRepo.findTemplates(issuerId);
};

// 유저에게 쿠폰 지급
export const giveCoupon = async (issuerId: string, input: GiveCouponInput) => {
  const { userId, templateId } = input;

  // 템플릿 존재 여부 확인
  const template = await couponRepo.findTemplateById(templateId);
  if (!template) {
    throw new AppError(404, "쿠폰 템플릿을 찾을 수 없습니다.", "COUPON_TEMPLATE_NOT_FOUND");
  }

  // 본인이 생성한 템플릿인지 확인
  if (template.issuerId !== issuerId) {
    throw new AppError(403, "본인이 생성한 쿠폰만 지급할 수 있습니다.", "FORBIDDEN");
  }

  // 만료된 템플릿인지 체크
  if (template.expiresAt && new Date(template.expiresAt) < new Date()) {
    throw new AppError(400, "만료된 쿠폰 템플릿입니다.", "COUPON_TEMPLATE_EXPIRED");
  }

  // 지급 대상 유저 존재 여부 확인
  const targetUser = await findUserById(userId);
  if (!targetUser) {
    throw new AppError(404, "존재하지 않는 유저입니다.", "USER_NOT_FOUND");
  }

  // 발급 시 템플릿 정보를 스냅샷으로 복사 (템플릿 삭제 후에도 쿠폰 유효)
  return await couponRepo.giveCouponToUser(userId, templateId, {
    couponName: template.name,
    discountPoints: template.discountPoints,
    discountPercentage: template.discountPercentage,
    expiresAt: template.expiresAt,
  });
};

// 쿠폰 템플릿 수정
export const updateCouponTemplate = async (
  issuerId: string,
  id: string,
  input: UpdateCouponTemplateInput,
) => {
  const { discountType, usageValue, ...rest } = input;

  const existing = await couponRepo.findTemplateById(id);
  if (!existing) {
    throw new AppError(404, "쿠폰 템플릿을 찾을 수 없습니다.", "COUPON_TEMPLATE_NOT_FOUND");
  }

  // 본인 확인
  if (existing.issuerId !== issuerId) {
    throw new AppError(403, "본인이 생성한 쿠폰만 수정할 수 있습니다.", "FORBIDDEN");
  }

  // 만료일 변경 시 과거 날짜 체크
  if (rest.expiresAt && new Date(rest.expiresAt) < new Date()) {
    throw new AppError(400, "만료일은 현재 시간 이후여야 합니다.", "INVALID_EXPIRES_AT");
  }

  const updateData: any = { ...rest };

  // 할인 정보가 변경되는 경우 처리
  if (discountType || usageValue) {
    if (discountType && usageValue) {
      if (discountType === "PERCENTAGE") {
        if (usageValue < 0 || usageValue > 100) {
          throw new AppError(400, "할인율은 0%에서 100% 사이여야 합니다.", "INVALID_DISCOUNT_PERCENTAGE");
        }
        updateData.discountPoints = null;
        updateData.discountPercentage = usageValue;
      } else {
        updateData.discountPoints = usageValue;
        updateData.discountPercentage = null;
      }
    } else if (usageValue) {
      if (existing.discountPercentage !== null) {
        if (usageValue < 0 || usageValue > 100) {
          throw new AppError(400, "할인율은 0%에서 100% 사이여야 합니다.", "INVALID_DISCOUNT_PERCENTAGE");
        }
        updateData.discountPercentage = usageValue;
      } else {
        updateData.discountPoints = usageValue;
      }
    } else if (discountType) {
      throw new AppError(400, "할인 타입을 변경하려면 할인 값도 함께 입력해야 합니다.", "INVALID_DISCOUNT_TYPE");
    }
  }

  return await couponRepo.updateTemplate(id, updateData);
};

// 쿠폰 템플릿 삭제
export const deleteCouponTemplate = async (issuerId: string, id: string) => {
  const template = await couponRepo.findTemplateById(id);
  if (!template) {
    throw new AppError(404, "쿠폰 템플릿을 찾을 수 없습니다.", "COUPON_TEMPLATE_NOT_FOUND");
  }

  // 본인 확인
  if (template.issuerId !== issuerId) {
    throw new AppError(403, "본인이 생성한 쿠폰만 삭제할 수 있습니다.", "FORBIDDEN");
  }

  return await couponRepo.deleteTemplate(id);
};

// 특정 유저의 쿠폰함 조회
export const getUserCoupons = async (userId: string) => {
  return await couponRepo.findUserCoupons(userId);
};
