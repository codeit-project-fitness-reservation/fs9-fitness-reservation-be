import type {
  CreateCenterInput,
  UpdateCenterInput,
  QueryCenterInput,
} from "./center.validation.ts";
import type { PaginationResponse } from "../../types/common.types.ts";
import { AppError } from "../../middlewares/errorHandler.ts";
import * as centerRepository from "./center.repository.ts";
import { Prisma } from "@prisma/client";

// 센터 등록
// 판매자 1명당 센터 1개만 등록 가능
export async function createCenter(userId: string, data: CreateCenterInput) {
  const existingCenter = await centerRepository.findCenterByOwnerId(userId);

  if (existingCenter) {
    throw new AppError(
      409,
      "이미 센터를 소유하고 있습니다",
      "CENTER_ALREADY_EXISTS",
    );
  }

  const newCenter = await centerRepository.createCenter({
    ownerId: userId,
    name: data.name,
    address1: data.address1,
    address2: data.address2 ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
  });

  return newCenter;
}

// 센터 목록 조회
export async function getCenters(
  query: QueryCenterInput,
): Promise<PaginationResponse<any>> {
  const name = query.name;
  const sort = query.sort;
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const where: any = {};

  let orderBy: Prisma.CenterOrderByWithRelationInput | Prisma.CenterOrderByWithRelationInput[];
  if (sort === "name") {
    orderBy = { name: "asc" };
  } else {
    orderBy = { createdAt: "desc" };
  }
  if (name) {
    where.name = { contains: name, mode: "insensitive" };
  }

  const skip = (page - 1) * limit;

  const [centers, total] = await Promise.all([
    centerRepository.findManycenters({ where, orderBy, skip, take: limit }),
    centerRepository.countCenters(where),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: centers,
    total,
    page,
    limit,
    totalPages,
  };
}

// 내 센터 조회 (로그인한 SELLER 본인 소유 센터)
export async function getMyCenter(userId: string) {
  const center = await centerRepository.findCenterByOwnerId(userId);
  if (!center) {
    throw new AppError(404, "등록된 센터가 없습니다", "CENTER_NOT_FOUND");
  }
  return centerRepository.findCenterById(center.id);
}

// 센터 상세 조회
export async function getCenterById(centerId: string) {
  const center = await centerRepository.findCenterById(centerId);

  if (!center) {
    throw new AppError(404, "센터를 찾을 수 없습니다", "CENTER_NOT_FOUND");
  }

  return center;
}

// 센터 수정
// 센터 소유자만 수정 가능 (소유권 검증)
export async function updateCenter(
  userId: string,
  centerId: string,
  data: UpdateCenterInput,
) {
  const center = await centerRepository.findCenterSimple(centerId);

  if (!center) {
    throw new AppError(404, "센터를 찾을 수 없습니다", "CENTER_NOT_FOUND");
  }

  if (center.ownerId !== userId) {
    throw new AppError(403, "센터 수정 권한이 없습니다", "FORBIDDEN");
  }

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.address1 !== undefined) updateData.address1 = data.address1;
  if (data.address2 !== undefined) updateData.address2 = data.address2;
  if (data.introduction !== undefined)
    updateData.introduction = data.introduction;
  if (data.businessHours !== undefined)
    updateData.businessHours = data.businessHours;
  if (data.lat !== undefined) updateData.lat = data.lat;
  if (data.lng !== undefined) updateData.lng = data.lng;

  const updatedCenter = await centerRepository.updateCenter(
    centerId,
    updateData,
  );

  return updatedCenter;
}

//내 센터 정보 수정 Auth에서 사용
export async function updateMyCenter(
  userId: string,
  data: UpdateCenterInput,
  tx?: Prisma.TransactionClient, 
) {
  const center = await centerRepository.findCenterByOwnerId(userId);

  if (!center) {
    throw new AppError(404, "등록된 센터가 없습니다", "CENTER_NOT_FOUND");
  }

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.address1 !== undefined) updateData.address1 = data.address1;
  if (data.address2 !== undefined) updateData.address2 = data.address2;
  if (data.introduction !== undefined)
    updateData.introduction = data.introduction;

  if (Object.keys(updateData).length === 0) {
    return center;
  }

  if (tx) {
    return centerRepository.updateCenterWithTx(tx, center.id, updateData);
  }

  return centerRepository.updateCenter(center.id, updateData);
}
