import { UserRole } from "@prisma/client";
import * as userRepository from "./user.repository.ts";
import { AppError } from "../../middlewares/errorHandler.ts";

// 회원 목록 조회
export async function getUsers({
  page,
  limit,
  role,
  searchType,
  search,
}: {
  page: number;
  limit: number;
  role?: string | undefined;
  searchType?: string | undefined;
  search?: string | undefined;
}) {
  const validRole = Object.values(UserRole).includes(role as UserRole)
    ? (role as UserRole)
    : undefined;

  const validSearchType = ["nickname", "email", "phone"].includes(
    searchType as string
  )
    ? (searchType as "nickname" | "email" | "phone")
    : undefined;

  const { users, totalCount } = await userRepository.findManyUsers({
    page,
    limit,
    role: validRole,
    searchType: validSearchType,
    search,
  });

  const formattedUsers = users.map((user) => ({
    ...user,
    couponCount: user._count.userCoupons,
  }));

  return { users: formattedUsers, totalCount };
}

// 회원 상세 조회
export async function getUserById(userId: string) {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new AppError(404, "회원을 찾을 수 없습니다", "USER_NOT_FOUND");
  }

  return {
    ...user,
    couponCount: user._count.userCoupons,
    reservationCount: user._count.reservations,
    reviewCount: user._count.reviews,
  };
}

// 회원 통계 조회
export async function getUserStats() {
  return userRepository.getUserStats();
}


// [관리자] 회원 메모 수정
export async function updateUserNote(userId: string, note: string | null) {
  const existing = await userRepository.findUserById(userId);
  if (!existing) {
    throw new AppError(404, "회원을 찾을 수 없습니다", "USER_NOT_FOUND");
  }
  return userRepository.updateUserNote(userId, note);
}
