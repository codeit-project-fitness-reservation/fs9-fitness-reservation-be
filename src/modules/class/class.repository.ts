import prisma from "../../config/prisma.ts";
import { ClassStatus, Prisma } from "@prisma/client";

export async function findCenterByOwnerId(ownerId: string) {
  return prisma.center.findUnique({
    where: { ownerId },
  });
}

export async function createClass(data: Prisma.ClassCreateInput) {
  return prisma.class.create({
    data,
    include: {
      center: true,
    },
  });
}

export async function findManyClasses(params: {
  where: Prisma.ClassWhereInput;
  orderBy?: Prisma.ClassOrderByWithRelationInput | Prisma.ClassOrderByWithRelationInput[];
  skip: number;
  take: number;
}) {
  return prisma.class.findMany({
    where: {
      ...params.where,
      deletedAt: null,
    },
    skip: params.skip,
    take: params.take,
    include: {
      center: {
        select: {
          id: true,
          name: true,
          address1: true,
        },
      },
      reviews: {
        select: {
          rating: true,
        },
      },
      _count: {
        select: {
          reviews: true,
          reservations: {
            where: {
              status: "BOOKED",
            },
          },
        },
      },
    },
    orderBy: params.orderBy || { createdAt: "desc" },
  });
}

// 상태별 클래스 개수 카운트
export async function countClassesByStatus(status?: ClassStatus) {
  const where: Prisma.ClassWhereInput = {
    ...(status ? { status } : {}),
    deletedAt: null,
  };
  return prisma.class.count({ where });
}

export async function countClasses(where: Prisma.ClassWhereInput) {
  return prisma.class.count({
    where: {
      ...where,
      deletedAt: null,
    },
  });
}

export async function findClassById(classId: string, now: Date = new Date()) {
  return prisma.class.findFirst({
    where: {
      id: classId,
      deletedAt: null,
    },
    include: {
      center: {
        select: {
          id: true,
          name: true,
          address1: true,
          address2: true,
          introduction: true,
          businessHours: true,
          lat: true,
          lng: true,
        },
      },
      slots: {
        where: {
          startAt: {
            gte: now,
          },
          deletedAt: null,
        },
        orderBy: {
          startAt: "asc",
        },
        include: {
          _count: {
            select: {
              reservations: {
                where: {
                  status: "BOOKED",
                },
              },
            },
          },
        },
      },
      reviews: {
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImgUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
  });
}

export async function findClassWithCenter(classId: string) {
  return prisma.class.findFirst({
    where: {
      id: classId,
      deletedAt: null,
    },
    include: {
      center: true,
    },
  });
}

export async function findClassWithReservationCount(classId: string) {
  return prisma.class.findFirst({
    where: {
      id: classId,
      deletedAt: null,
    },
    include: {
      center: true,
      _count: {
        select: {
          reservations: {
            where: {
              status: {
                in: ["BOOKED", "COMPLETED"],
              },
            },
          },
        },
      },
    },
  });
}

export async function updateClass(
  classId: string,
  data: Prisma.ClassUpdateInput,
) {
  return prisma.class.update({
    where: { id: classId },
    data,
    include: {
      center: true,
    },
  });
}

export async function deleteClass(classId: string) {
  return prisma.class.update({
    where: { id: classId },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function findClassSimple(classId: string) {
  return prisma.class.findFirst({
    where: {
      id: classId,
      deletedAt: null,
    },
  });
}

export async function updateClassStatus(
  classId: string,
  status: ClassStatus,
  rejectReason?: string,
) {
  return prisma.class.update({
    where: { id: classId },
    data: {
      status,
      ...(rejectReason && { rejectReason }),
    },
    include: {
      center: {
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              nickname: true,
            },
          },
        },
      },
    },
  });
}

export async function findClassWithCenterForSlot(classId: string) {
  return prisma.class.findFirst({
    where: {
      id: classId,
      deletedAt: null,
    },
    include: {
      center: true,
    },
  });
}
export async function findOverlappingSlot(
  classId: string,
  startAt: Date,
  endAt: Date,
) {
  return prisma.classSlot.findFirst({
    where: {
      classId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      deletedAt: null,
    },
  });
}
export async function createSlot(data: Prisma.ClassSlotUncheckedCreateInput) {
  return prisma.classSlot.create({
    data,
  });
}

export async function findSlotWithClassAndReservations(slotId: string) {
  return prisma.classSlot.findFirst({
    where: {
      id: slotId,
      deletedAt: null,
    },
    include: {
      class: {
        include: {
          center: true,
        },
      },
      _count: {
        select: {
          reservations: {
            where: {
              status: "BOOKED",
            },
          },
        },
      },
    },
  });
}

export async function updateSlot(
  slotId: string,
  data: Prisma.ClassSlotUpdateInput,
) {
  return prisma.classSlot.update({
    where: { id: slotId },
    data,
  });
}

export async function findSlotForDelete(slotId: string) {
  return prisma.classSlot.findFirst({
    where: {
      id: slotId,
      deletedAt: null,
    },
    include: {
      class: {
        include: {
          center: true,
        },
      },
      _count: {
        select: {
          reservations: {
            where: {
              status: {
                in: ["BOOKED", "COMPLETED"],
              },
            },
          },
        },
      },
    },
  });
}

export async function deleteSlot(slotId: string) {
  return prisma.classSlot.update({
    where: { id: slotId },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function deleteSlotsByClassId(classId: string) {
  return prisma.classSlot.updateMany({
    where: {
      classId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}

// 클래스의 모든 예약 취소 
export async function cancelAllReservationsForClass(classId: string) {
  return prisma.reservation.updateMany({
    where: {
      slot: {
        classId,
      },
      status: "BOOKED",
    },
    data: {
      status: "CANCELED",
    },
  });
}

// 슬롯의 모든 예약 취소
export async function cancelAllReservationsForSlot(slotId: string) {
  return prisma.reservation.updateMany({
    where: {
      slotId,
      status: "BOOKED",
    },
    data: {
      status: "CANCELED",
    },
  });
}

// 클래스의 모든 슬롯 정원 업데이트
export async function updateAllSlotsCapacity(
  classId: string,
  capacity: number,
) {
  return prisma.classSlot.updateMany({
    where: {
      classId,
      deletedAt: null,
    },
    data: { capacity },
  });
}
