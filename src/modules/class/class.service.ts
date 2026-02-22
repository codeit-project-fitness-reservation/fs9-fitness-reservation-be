import { ClassStatus, UserRole, Prisma } from "@prisma/client";
import type {
  CreateClassInput,
  UpdateClassInput,
  QueryClassInput,
  RejectClassInput,
  CreateSlotInput,
  UpdateSlotInput,
} from "./class.validation.ts";
import type { PaginationResponse } from "../../types/common.types.ts";
import * as classRepository from "./class.repository.ts";
import * as reservationService from "../reservation/reservation.service.ts";
import { AppError } from "../../middlewares/errorHandler.ts";
import { sendNotification } from "../notification/notification.service.ts";

// 클래스 생성
export async function createClass(
  userId: string,
  data: CreateClassInput & { bannerUrl?: string; imgUrls?: string[] }
) {
  const center = await classRepository.findCenterByOwnerId(userId);

  if (!center) {
    throw new AppError(404, "센터 정보를 찾을 수 없습니다", "CENTER_NOT_FOUND");
  }

  const newClass = await classRepository.createClass({
    center: { connect: { id: center.id } },
    title: data.title,
    category: data.category,
    level: data.level,
    description: data.description ?? null,
    notice: data.notice ?? null,
    pricePoints: data.pricePoints,
    capacity: data.capacity,
    bannerUrl: data.bannerUrl ?? null,
    imgUrls: data.imgUrls ?? [],
    schedule: data.schedule ?? null,
    status: ClassStatus.PENDING,
  });

  return newClass;
}

// 클래스 목록 조회
export async function getClasses(
  query: QueryClassInput,
  userRole?: UserRole,
  userId?: string
) {
  const {
    category,
    level,
    status,
    centerId,
    search,
    sort,
    page = 1,
    limit = 10,
  } = query;

  const where: any = {};

  let orderBy: Prisma.ClassOrderByWithRelationInput | Prisma.ClassOrderByWithRelationInput[];

  if (sort === "popularity") {
    orderBy = {
      reviews: {
        _count: "desc",
      },
    };
  } else {
    orderBy = { createdAt: "desc" };
  }

  // 정렬 조건 설정


  if (category) where.category = category;
  if (level) where.level = level;
  if (centerId) where.centerId = centerId;

  // 판매자인 경우 자기 센터의 클래스만 조회
  if (userRole === UserRole.SELLER && userId) {
    const center = await classRepository.findCenterByOwnerId(userId);
    if (center) {
      where.centerId = center.id;
    }
  }

  if (search) {
    if (query.searchType === "centerName") {
      where.center = {
        name: { contains: search, mode: "insensitive" },
      };
    } else if (query.searchType === "className") {
      where.title = { contains: search, mode: "insensitive" };
    } else {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
  }

  if (!userRole || userRole === UserRole.CUSTOMER) {
    // 승인된 클래스만 노출
    where.status = ClassStatus.APPROVED;
  } else {
    if (status) where.status = status;
  }

  const skip = (page - 1) * limit;

  const [classes, totalCount] = await Promise.all([
    classRepository.findManyClasses({
      where,
      skip,
      take: limit,
    }),
    classRepository.countClasses(where),
  ]);

  const classList = classes.map((cls) => {
    const reviewCount = cls._count.reviews;
    const totalRating = cls.reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviewCount > 0 ? Number((totalRating / reviewCount).toFixed(1)) : 0;

    const { reviews, _count, ...rest } = cls; 
    return {
      ...rest,
      rating: averageRating,
      reviewCount,
    };
  });

  return {
    data: classList,
    total: totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

// 클래스 상세 조회

export async function getClassById(classId: string, userRole?: UserRole) {
  const classData = await classRepository.findClassById(classId, new Date());

  if (!classData) {
    throw new AppError(404, "클래스를 찾을 수 없습니다", "CLASS_NOT_FOUND");
  }

  if (
    (!userRole || userRole === UserRole.CUSTOMER) &&
    classData.status !== ClassStatus.APPROVED
  ) {
    throw new AppError(404, "클래스를 찾을 수 없습니다", "CLASS_NOT_FOUND");
  }

  return classData;
}

// 클래스 통계 조회 (전체, 승인, 대기, 반려)
export async function getClassStats() {
  const [total, approved, pending, rejected] = await Promise.all([
    classRepository.countClassesByStatus(),
    classRepository.countClassesByStatus(ClassStatus.APPROVED),
    classRepository.countClassesByStatus(ClassStatus.PENDING),
    classRepository.countClassesByStatus(ClassStatus.REJECTED),
  ]);

  return {
    total,
    approved,
    pending,
    rejected,
  };
}

// 클래스 수정

export async function updateClass(
  userId: string,
  classId: string,
  data: UpdateClassInput & { bannerUrl?: string; imgUrls?: string[] }
) {
  const existingClass = await classRepository.findClassWithCenter(classId);

  if (!existingClass) {
    throw new AppError(404, "클래스를 찾을 수 없습니다", "CLASS_NOT_FOUND");
  }

  if (existingClass.center.ownerId !== userId) {
    throw new AppError(403, "클래스 수정 권한이 없습니다", "FORBIDDEN");
  }

  // 클래스 수정 시 모든 예약 취소 및 환불
  await reservationService.cancelReservationsByClassChange(
    classId,
    "클래스 정보가 변경되어 예약이 취소되었습니다"
  );

  const updateData = {
    title: data.title !== undefined ? data.title : existingClass.title,
    category:
      data.category !== undefined ? data.category : existingClass.category,
    level: data.level !== undefined ? data.level : existingClass.level,
    description:
      data.description !== undefined
        ? data.description
        : (existingClass.description ?? null),
    notice:
      data.notice !== undefined ? data.notice : (existingClass.notice ?? null),
    pricePoints:
      data.pricePoints !== undefined
        ? data.pricePoints
        : existingClass.pricePoints,
    capacity:
      data.capacity !== undefined ? data.capacity : existingClass.capacity,
    bannerUrl:
      data.bannerUrl !== undefined
        ? data.bannerUrl
        : (existingClass.bannerUrl ?? null),
    imgUrls: data.imgUrls !== undefined ? data.imgUrls : existingClass.imgUrls,
    schedule:
      data.schedule !== undefined
        ? data.schedule
        : (existingClass.schedule ?? null),
  };

  // 클래스 정원이 변경되면 모든 슬롯 정원도 업데이트
  if (data.capacity !== undefined && data.capacity !== existingClass.capacity) {
    await classRepository.updateAllSlotsCapacity(classId, data.capacity);
  }

  const updatedClass = await classRepository.updateClass(classId, updateData);

  return updatedClass;
}

// 클래스 삭제

export async function deleteClass(
  userId: string,
  classId: string,
  userRole?: UserRole
) {
  const existingClass = await classRepository.findClassWithCenter(classId);

  if (!existingClass) {
    throw new AppError(404, "클래스를 찾을 수 없습니다", "CLASS_NOT_FOUND");
  }

  // 관리자가 아니면 본인 소유 클래스만 삭제 가능
  if (userRole !== UserRole.ADMIN && existingClass.center.ownerId !== userId) {
    throw new AppError(403, "클래스 삭제 권한이 없습니다", "FORBIDDEN");
  }

  // 클래스 삭제 시 모든 예약 취소 및 환불
  await reservationService.cancelReservationsByClassChange(
    classId,
    "클래스가 삭제되어 예약이 취소되었습니다"
  );
  
  // 슬롯 Soft Delete
  await classRepository.deleteSlotsByClassId(classId);
  
  // 클래스 Soft Delete
  await classRepository.deleteClass(classId);

  return { message: "클래스가 삭제되었습니다" };
}

// 클래스 승인

export async function approveClass(classId: string) {
  const existingClass = await classRepository.findClassSimple(classId);

  if (!existingClass) {
    throw new AppError(404, "클래스를 찾을 수 없습니다", "CLASS_NOT_FOUND");
  }

  if (existingClass.status !== ClassStatus.PENDING) {
    throw new AppError(
      400,
      "승인 대기 중인 클래스만 처리할 수 있습니다",
      "INVALID_STATUS"
    );
  }

  const updatedClass = await classRepository.updateClassStatus(
    classId,
    ClassStatus.APPROVED
  );

  // [판매자] 클래스 승인 알림
  void sendNotification({
    userId: updatedClass.center.ownerId,
    title: "클래스가 승인되었습니다",
    body: `'${updatedClass.title}' 클래스가 관리자에게 승인되었습니다.`,
    linkUrl: `/seller/classes`,
  });

  return updatedClass;
}

// 클래스 반려

export async function rejectClass(classId: string, data: RejectClassInput) {
  const existingClass = await classRepository.findClassSimple(classId);

  if (!existingClass) {
    throw new AppError(404, "클래스를 찾을 수 없습니다", "CLASS_NOT_FOUND");
  }

  if (existingClass.status !== ClassStatus.PENDING) {
    throw new AppError(
      400,
      "승인 대기 중인 클래스만 처리할 수 있습니다",
      "INVALID_STATUS"
    );
  }

  const updatedClass = await classRepository.updateClassStatus(
    classId,
    ClassStatus.REJECTED,
    data.rejectReason
  );

  // [판매자] 클래스 반려 알림
  void sendNotification({
    userId: updatedClass.center.ownerId,
    title: "클래스가 반려되었습니다",
    body: `'${updatedClass.title}' 클래스가 반려되었습니다.${data.rejectReason ? ` 사유: ${data.rejectReason}` : ""}`,
    linkUrl: `/seller/classes`,
  });

  return updatedClass;
}

// 슬롯 생성

export async function createSlot(
  userId: string,
  classId: string,
  data: CreateSlotInput,
  now: Date = new Date()
) {
  const classData = await classRepository.findClassWithCenterForSlot(classId);

  if (!classData) {
    throw new AppError(404, "클래스를 찾을 수 없습니다", "CLASS_NOT_FOUND");
  }

  if (classData.center.ownerId !== userId) {
    throw new AppError(403, "슬롯 생성 권한이 없습니다", "FORBIDDEN");
  }

  if (data.capacity > classData.capacity) {
    throw new AppError(
      400,
      `슬롯 정원은 클래스 정원(${classData.capacity}명) 이하여야 합니다`,
      "INVALID_CAPACITY"
    );
  }

  const startAt = new Date(
    `${data.date}T${String(data.hour).padStart(2, "0")}:00:00+09:00`
  );

  if (isNaN(startAt.getTime())) {
    throw new AppError(
      400,
      "올바른 날짜 형식이 아닙니다",
      "INVALID_DATE_FORMAT"
    );
  }

  if (startAt < now) {
    throw new AppError(
      400,
      "과거 날짜는 슬롯으로 생성할 수 없습니다",
      "INVALID_DATE"
    );
  }

  const endAt = new Date(startAt);
  endAt.setHours(endAt.getHours() + 1);

  const overlappingSlot = await classRepository.findOverlappingSlot(
    classId,
    startAt,
    endAt
  );

  if (overlappingSlot) {
    throw new AppError(
      409,
      "해당 시간대에 이미 슬롯이 존재합니다",
      "DUPLICATE_SLOT"
    );
  }

  const newSlot = await classRepository.createSlot({
    classId,
    startAt,
    endAt,
    capacity: data.capacity,
    isOpen: data.isOpen,
  });

  return newSlot;
}

// 슬롯 수정

export async function updateSlot(
  userId: string,
  slotId: string,
  data: UpdateSlotInput
) {
  const slot = await classRepository.findSlotWithClassAndReservations(slotId);

  if (!slot) {
    throw new AppError(404, "슬롯을 찾을 수 없습니다", "SLOT_NOT_FOUND");
  }

  if (slot.class.center.ownerId !== userId) {
    throw new AppError(403, "슬롯 수정 권한이 없습니다", "FORBIDDEN");
  }

  const updatedSlot = await classRepository.updateSlot(slotId, data);

  return updatedSlot;
}

// 슬롯 삭제

export async function deleteSlot(userId: string, slotId: string) {
  const slot = await classRepository.findSlotWithClassAndReservations(slotId);

  if (!slot) {
    throw new AppError(404, "슬롯을 찾을 수 없습니다", "SLOT_NOT_FOUND");
  }

  if (slot.class.center.ownerId !== userId) {
    throw new AppError(403, "슬롯 삭제 권한이 없습니다", "FORBIDDEN");
  }

  // 슬롯 삭제 시 모든 예약 취소 및 환불
  await reservationService.cancelReservationsBySlotChange(
    slotId,
    "슬롯이 삭제되어 예약이 취소되었습니다"
  );

  await classRepository.deleteSlot(slotId);

  return { message: "슬롯이 삭제되었습니다" };
}

// 스케줄 기반 슬롯 자동 생성

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export async function generateSlotsFromSchedule(
  userId: string,
  classId: string,
  startDate: Date,
  endDate: Date
) {
  const classData = await classRepository.findClassWithCenterForSlot(classId);

  if (!classData) {
    throw new AppError(404, "클래스를 찾을 수 없습니다", "CLASS_NOT_FOUND");
  }

  if (classData.center.ownerId !== userId) {
    throw new AppError(403, "슬롯 생성 권한이 없습니다", "FORBIDDEN");
  }

  if (!classData.schedule) {
    throw new AppError(400, "클래스에 스케줄 정보가 없습니다", "NO_SCHEDULE");
  }

  const schedule = classData.schedule as Record<string, string | null>;
  let createdCount = 0;
  let skippedCount = 0;

  // startDate부터 endDate까지 날짜 순회
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const dayName = Object.keys(DAY_MAP).find(
      (key) => DAY_MAP[key] === dayOfWeek
    );

    if (dayName && schedule[dayName]) {
      const timeStr = schedule[dayName] as string;
      const [hourStr] = timeStr.split(":");

      if (!hourStr) continue;

      const hour = parseInt(hourStr, 10);

      if (!isNaN(hour) && hour >= 0 && hour <= 23) {
        const startAt = new Date(currentDate);
        startAt.setHours(hour, 0, 0, 0);

        const endAt = new Date(startAt);
        endAt.setHours(endAt.getHours() + 1);

        // 이미 존재하는 슬롯인지 확인
        const existingSlot = await classRepository.findOverlappingSlot(
          classId,
          startAt,
          endAt
        );

        if (!existingSlot) {
          await classRepository.createSlot({
            classId,
            startAt,
            endAt,
            capacity: classData.capacity,
            isOpen: true,
          });
          createdCount++;
        } else {
          skippedCount++;
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    message: "슬롯 생성이 완료되었습니다",
    createdCount,
    skippedCount,
  };
}
