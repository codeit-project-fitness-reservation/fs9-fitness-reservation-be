import prisma from "../../config/prisma.ts";

// 쿠폰 템플릿 생성
export const createTemplate = async (data: {
  name: string;
  discountPoints?: number | null;
  discountPercentage?: number | null;
  expiresAt: Date | null;
  issuerId: string;
  centerId?: string | null;
}) => {
  return await prisma.couponTemplate.create({
    data,
  });
};

// 내가 생성한 쿠폰 템플릿 조회
export const findTemplates = async (issuerId: string) => {
  return await prisma.couponTemplate.findMany({
    where: { issuerId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { userCoupons: true },
      },
    },
  });
};

// 특정 쿠폰 템플릿 조회
export const findTemplateById = async (id: string) => {
  return await prisma.couponTemplate.findUnique({
    where: { id },
  });
};

// 유저에게 쿠폰 지급 (발급 시점 스냅샷 저장)
export const giveCouponToUser = async (
  userId: string,
  templateId: string,
  snapshot: {
    couponName: string;
    discountPoints: number | null;
    discountPercentage: number | null;
    expiresAt: Date | null;
  },
) => {
  return await prisma.userCoupon.create({
    data: {
      userId,
      templateId,
      issuedAt: new Date(),
      couponName: snapshot.couponName,
      discountPoints: snapshot.discountPoints,
      discountPercentage: snapshot.discountPercentage,
      expiresAt: snapshot.expiresAt,
    },
  });
};

// 템플릿 수정
export const updateTemplate = async (id: string, data: any) => {
  return await prisma.couponTemplate.update({
    where: { id },
    data,
  });
};

// 템플릿 삭제
export const deleteTemplate = async (id: string) => {
  return await prisma.couponTemplate.delete({
    where: { id },
  });
};

// 유저가 보유한 쿠폰 목록 조회 (스냅샷 필드 기반 - 템플릿 삭제 후에도 유효)
export const findUserCoupons = async (userId: string) => {
  const now = new Date();
  return await prisma.userCoupon.findMany({
    where: {
      userId,
      usedAt: null, // 미사용 쿠폰
      // template join 없이 스냅샷 필드로 만료일 필터 (템플릿 삭제 후에도 유효)
      OR: [
        { expiresAt: { gte: now } }, // 만료일이 현재보다 미래
        { expiresAt: null },         // 만료일 없음
      ],
    },
    select: {
      id: true,
      userId: true,
      templateId: true,
      // 스냅샷 필드 (템플릿이 삭제되어도 유지됨)
      couponName: true,
      discountPoints: true,
      discountPercentage: true,
      expiresAt: true,
      issuedAt: true,
      usedAt: true,
    },
    orderBy: {
      issuedAt: "desc",
    },
  });
};
