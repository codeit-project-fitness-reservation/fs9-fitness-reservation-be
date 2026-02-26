import prisma from '../../config/prisma.ts';
import { Prisma } from '@prisma/client';

// 소유자 ID로 센터 조회
export async function findCenterByOwnerId(ownerId: string) {
  return prisma.center.findUnique({
    where: { ownerId },
  });
}

// 센터 생성
export async function createCenter(data: Prisma.CenterUncheckedCreateInput) {
  return prisma.center.create({
    data,
  });
}

// 센터 목록 조회 (페이지네이션)
export async function findManycenters(params: {
  where: Prisma.CenterWhereInput;
  orderBy?: Prisma.CenterOrderByWithRelationInput | Prisma.CenterOrderByWithRelationInput[];
  skip: number;
  take: number;
}) {
  return prisma.center.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    include: {
      owner: {
        select: {
          id: true,
          nickname: true,
        },
      },
      _count: {
        select: {
          classes: true,
        },
      },
    },
    orderBy: params.orderBy || { createdAt: 'desc' },
  });
}

// 센터 개수 조회
export async function countCenters(where: Prisma.CenterWhereInput) {
  return prisma.center.count({ where });
}

// 센터 상세 조회 (ID 기반)
export async function findCenterById(centerId: string) {
  return prisma.center.findUnique({
    where: { id: centerId },
    include: {
      owner: {
        select: {
          id: true,
          nickname: true,
          email: true,
        },
      },
      classes: {
        select: {
          id: true,
          title: true,
          status: true,
          pricePoints: true,
        },
      },
    },
  });
}

// 센터 단순 조회 (권한 확인용)
export async function findCenterSimple(centerId: string) {
  return prisma.center.findUnique({
    where: { id: centerId },
  });
}

// 센터 조회 (클래스 수 포함)
export async function findCenterWithClassCount(centerId: string) {
  return prisma.center.findUnique({
    where: { id: centerId },
    include: {
      _count: {
        select: {
          classes: true,
        },
      },
    },
  });
}

// 센터 수정
export async function updateCenter(centerId: string, data: Prisma.CenterUpdateInput) {
  return prisma.center.update({
    where: { id: centerId },
    data,
  });
}

// 센터 수정 (트랜잭션 지원)
export async function updateCenterWithTx(
  tx: Prisma.TransactionClient,
  centerId: string,
  data: Prisma.CenterUpdateInput
) {
  return tx.center.update({
    where: { id: centerId },
    data,
  });
}

// 센터 삭제
export async function deleteCenter(centerId: string) {
  return prisma.center.delete({
    where: { id: centerId },
  });
}
