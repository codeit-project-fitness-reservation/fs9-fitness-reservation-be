import { Prisma, UserRole } from "@prisma/client";
import prisma from "../../config/prisma.ts";

// 회원 목록 조회
export async function findManyUsers({
  page,
  limit,
  role,
  searchType,
  search,
}: {
  page: number;
  limit: number;
  role?: UserRole | undefined;
  searchType?: "nickname" | "email" | "phone" | undefined;
  search?: string | undefined;
}) {
  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role;
  }

  if (search) {
    if (searchType === "nickname") {
      where.nickname = { contains: search, mode: "insensitive" };
    } else if (searchType === "email") {
      where.email = { contains: search, mode: "insensitive" };
    } else if (searchType === "phone") {
      where.phone = { contains: search };
    }
  }

  const users = await prisma.user.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { userCoupons: true },
      },
    },
  });

  const totalCount = await prisma.user.count({ where });

  return { users, totalCount };
}

export async function getUserStats() {
  const total = await prisma.user.count();
  const customer = await prisma.user.count({
    where: { role: UserRole.CUSTOMER },
  });
  const seller = await prisma.user.count({ where: { role: UserRole.SELLER } });

  return { total, customer, seller };
}

// 회원 상세 조회
export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      center: true,
      reservations: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          slot: {
            include: {
              class: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          userCoupons: true,
          reservations: true,
          reviews: true,
        },
      },
      pointHistory: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// 프로필 수정
export async function updateUser(
  userId: string,
  data: Prisma.UserUpdateInput,
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      nickname: true,
      phone: true,
      profileImgUrl: true,
      introduction: true,
      role: true,
      updatedAt: true,
    },
  });
}

// [관리자] 회원 메모
export async function updateUserNote(userId: string, note: string | null) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { note },
    select: { note: true },
  });
  return updated;
}
