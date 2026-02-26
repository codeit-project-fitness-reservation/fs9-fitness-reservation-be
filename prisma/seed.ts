import {
  PrismaClient,
  UserRole,
  ClassStatus,
  ReservationStatus,
  PointUsed,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// --- 헬퍼 함수 ---
function createCuid() {
  const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  return 'c' + "00000000000".slice(0, 11) + S4() + S4() + S4();
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log("🌱 시드 데이터 생성 시작 \n");

  // 1. 기존 데이터 정리
  const tables = [
    "point_history",
    "reviews",
    "reservations",
    "user_coupons",
    "notifications",
    "class_slots",
    "classes",
    "coupon_templates",
    "centers",
    "users",
  ];

  for (const table of tables) {
    try {
      // PostgreSQL 전용 TRUNCATE (속도 및 완전 삭제 보장)
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (e) {
      console.log(`⚠️ ${table} 초기화 건너뜀 또는 실패 (테이블이 없거나 비어 있음)`);
    }
  }
  console.log("🧹 기존 데이터 삭제 완료\n");

  const password = await bcrypt.hash("test1234", 10);

  // 2. 유저 생성 (관리자, 판매자, 고객)
  const adminId = createCuid();
  await prisma.user.create({
    data: {
      id: adminId,
      email: "admin@test.com",
      password,
      nickname: "관리자",
      role: UserRole.ADMIN,
      phone: "010-0000-0000",
    }
  });

  const sellers = [];
  for (let i = 1; i <= 3; i++) {
    const id = createCuid();
    const user = await prisma.user.create({
      data: {
        id,
        email: `seller${i}@test.com`,
        password,
        nickname: `판매자${i}`,
        role: UserRole.SELLER,
        phone: `010-1000-000${i}`,
      }
    });
    sellers.push(user);
  }

  const customers = [];
  for (let i = 1; i <= 10; i++) {
    const id = createCuid();
    const initialPoints = i <= 8 ? 500000 : 0; // 8명은 부자, 2명은 빈털터리
    const user = await prisma.user.create({
      data: {
        id,
        email: `customer${i}@test.com`,
        password,
        nickname: `고객${i}`,
        role: UserRole.CUSTOMER,
        phone: `010-2000-00${i.toString().padStart(2, '0')}`,
        pointBalance: initialPoints, 
      }
    });

    if (initialPoints > 0) {
      await prisma.pointHistory.create({
        data: {
          id: createCuid(),
          userId: id,
          type: PointUsed.CHARGE,
          amount: initialPoints,
          balanceBefore: 0,
          balanceAfter: initialPoints,
          memo: "초기 가입 축하금",
        }
      });
    }
    customers.push(user);
  }
  console.log(`✅ 유저 생성 완료: 관리자 1명, 판매자 ${sellers.length}명, 고객 ${customers.length}명`);

  // 3. 센터 생성 (판매자 당 1개)
  const centers = [];
  const categories = ["헬스", "요가", "필라테스", "크로스핏"];
  
  for (const seller of sellers) {
    const id = createCuid();
    const center = await prisma.center.create({
      data: {
        id,
        ownerId: seller.id,
        name: `${seller.nickname}의 피트니스`,
        address1: "서울시 강남구 테헤란로 123",
        address2: "2층",
        introduction: "최고의 시설과 강사진을 자랑합니다.",
        lat: 37.4979,
        lng: 127.0276,
        businessHours: {
          mon: "09:00-22:00",
          tue: "09:00-22:00",
          wed: "09:00-22:00",
          thu: "09:00-22:00",
          fri: "09:00-22:00",
          sat: "10:00-18:00",
          sun: null
        }
      }
    });
    centers.push(center);
  }
  console.log(`✅ 센터 ${centers.length}개 생성 완료`);

  // 4. 쿠폰 템플릿 생성
  // 글로벌 쿠폰
  const globalCoupon = await prisma.couponTemplate.create({
    data: {
      id: createCuid(),
      name: "신규 가입 환영 쿠폰",
      discountPoints: 5000,
      issuerId: adminId,
    }
  });

  // 센터 전용 쿠폰
  const centerCoupons = [];
  for (const center of centers) {
    const tpl = await prisma.couponTemplate.create({
      data: {
        id: createCuid(),
        centerId: center.id,
        name: `${center.name} 10% 할인`,
        discountPercentage: 10,
        issuerId: center.ownerId,
      }
    });
    centerCoupons.push(tpl);
  }

  // 고객에게 쿠폰 발급
  for (const customer of customers) {
    // 모든 고객에게 글로벌 쿠폰 지급
    await prisma.userCoupon.create({
      data: {
        id: createCuid(),
        userId: customer.id,
        templateId: globalCoupon.id,
        issuedAt: new Date(),
        couponName: globalCoupon.name,
        discountPoints: globalCoupon.discountPoints,
        discountPercentage: globalCoupon.discountPercentage,
        expiresAt: globalCoupon.expiresAt,
      }
    });
    // 일부 고객에게 센터 전용 쿠폰 랜덤 지급
    if (Math.random() > 0.5) {
      const selectedTemplate = randomItem(centerCoupons);
      await prisma.userCoupon.create({
        data: {
          id: createCuid(),
          userId: customer.id,
          templateId: selectedTemplate.id,
          issuedAt: new Date(),
          couponName: selectedTemplate.name,
          discountPoints: selectedTemplate.discountPoints,
          discountPercentage: selectedTemplate.discountPercentage,
          expiresAt: selectedTemplate.expiresAt,
        }
      });
    }
  }
  console.log("✅ 쿠폰 템플릿 생성 및 발급 완료");

  // 5. 클래스 및 슬롯 생성
  const classes = [];
  const now = new Date();
  
  for (const center of centers) {
    const classCount = 4;
    for (let k = 0; k < classCount; k++) {
      const status = k === 0 ? ClassStatus.PENDING : (k === 1 ? ClassStatus.REJECTED : ClassStatus.APPROVED);
      const price = randomItem([10000, 20000, 30000, 50000]);
      
      const newClass = await prisma.class.create({
        data: {
          id: createCuid(),
          centerId: center.id,
          title: `${categories[k % categories.length]} 클래스 ${k+1}`,
          category: categories[k % categories.length],
          level: randomItem(["입문", "초급", "중급", "고급"]),
          pricePoints: price,
          capacity: 10,
          status: status,
          description: "함께 땀 흘리며 건강해지는 시간입니다.",
          rejectReason: status === ClassStatus.REJECTED ? "사진 해상도가 너무 낮습니다." : null,
          imgUrls: [],
        }
      });
      classes.push(newClass);

      // 승인된 클래스에 대해 슬롯 생성 (지난 7일 ~ 향후 14일)
      if (status === ClassStatus.APPROVED) {
        for (let d = -7; d <= 14; d++) {
          const date = new Date(now);
          date.setDate(date.getDate() + d);
          
          // 하루 2타임 생성: 10:00, 19:00
          const times = [10, 19];
          for (const hour of times) {
            const startAt = new Date(date);
            startAt.setHours(hour, 0, 0, 0);
            const endAt = new Date(startAt);
            endAt.setHours(hour + 1, 0, 0, 0);

            await prisma.classSlot.create({
              data: {
                id: createCuid(),
                classId: newClass.id,
                startAt,
                endAt,
                capacity: 10,
                isOpen: true,
                currentReservation: 0 
              }
            });
          }
        }
      }
    }
  }
  console.log(`✅ 클래스 및 슬롯 생성 완료`);

  // 6. 예약 생성
  const allSlots = await prisma.classSlot.findMany({
    include: { class: true }
  });
  
  let reservationCount = 0;

  for (const customer of customers) {
    if (customer.pointBalance <= 0) continue; // 포인트 없는 고객 제외

    // 랜덤하게 섞은 뒤 순회하며 시간대 중복 체크하여 3-5개 선택
    const shuffledSlots = allSlots.sort(() => 0.5 - Math.random());
    const targetSlots: typeof allSlots = [];
    const bookedTimes = new Set<number>();
    const maxReservations = randomInt(3, 5);

    for (const slot of shuffledSlots) {
      if (targetSlots.length >= maxReservations) break;
      
      const timeKey = slot.startAt.getTime();
      if (bookedTimes.has(timeKey)) continue; // 이미 해당 시간대에 예약함

      bookedTimes.add(timeKey);
      targetSlots.push(slot);
    }

    for (const slot of targetSlots) {
      // 로직: 포인트 확인 -> 차감 -> 슬롯 업데이트 -> 예약 생성 -> 내역 기록
      
      // 가격 계산
      const price = slot.class.pricePoints;
      
      // 쿠폰 사용 (랜덤)
      let discount = 0;
      let usedUserCouponId = null;
      
      // 사용하지 않은 쿠폰 조회
      const myCoupon = await prisma.userCoupon.findFirst({
        where: { userId: customer.id, usedAt: null },
        include: { template: true }
      });

      if (myCoupon && Math.random() > 0.5) {
        // 적용 가능 여부 단순 체크 (글로벌이거나 센터 ID 일치)
        const centerId = myCoupon.template?.centerId; 
        const isGlobal = !centerId;
        const isMatch = centerId === slot.class.centerId;
        
        if (isGlobal || isMatch) {
          if (myCoupon.discountPoints) {
            discount = myCoupon.discountPoints;
          } else if (myCoupon.discountPercentage) {
            discount = Math.floor(price * myCoupon.discountPercentage / 100);
          }
          usedUserCouponId = myCoupon.id;
        }
      }

      const payAmount = Math.max(0, price - discount);

      // 잔액 확인 (시드 데이터라 대략적으로 처리하지만 안전하게 다시 조회)
      const freshUser = await prisma.user.findUnique({ where: { id: customer.id }});
      if (!freshUser || freshUser.pointBalance < payAmount) continue;

      // 시간 기준 상태 결정
      let rStatus: ReservationStatus = ReservationStatus.BOOKED;
      if (slot.startAt < now) {
        rStatus = ReservationStatus.COMPLETED; // 지난 슬롯은 완료 처리
      }

      // 1. 예약 생성
      const reservationId = createCuid();
      await prisma.reservation.create({
        data: {
          id: reservationId,
          userId: customer.id,
          classId: slot.classId,
          slotId: slot.id,
          status: rStatus,
          slotStartAt: slot.startAt,
          pricePoints: price,
          couponDiscountPoints: discount,
          paidPoints: payAmount,
          userCouponId: usedUserCouponId,
          completedAt: rStatus === ReservationStatus.COMPLETED ? slot.endAt : null,
        }
      });

      // 2. 쿠폰 사용 처리
      if (usedUserCouponId) {
        await prisma.userCoupon.update({
          where: { id: usedUserCouponId },
          data: { usedAt: new Date() }
        });
      }

      // 3. 포인트 차감 및 내역 기록
      await prisma.user.update({
        where: { id: customer.id },
        data: { pointBalance: { decrement: payAmount } }
      });

      await prisma.pointHistory.create({
        data: {
          id: createCuid(),
          userId: customer.id,
          type: PointUsed.USE,
          amount: payAmount,
          balanceBefore: freshUser.pointBalance,
          balanceAfter: freshUser.pointBalance - payAmount,
          reservationId: reservationId,
        }
      });

      // 4. 슬롯 예약 수 업데이트
      await prisma.classSlot.update({
        where: { id: slot.id },
        data: { currentReservation: { increment: 1 } }
      });
      
      reservationCount++;

      // 5. 리뷰 생성 (완료된 예약인 경우)
      if (rStatus === ReservationStatus.COMPLETED && Math.random() > 0.3) {
        await prisma.review.create({
          data: {
             id: createCuid(),
             reservationId: reservationId,
             userId: customer.id,
             classId: slot.classId,
             rating: randomInt(3, 5),
             content: randomItem(["너무 좋았어요!", "힘들지만 보람찹니다.", "시설이 깨끗해요.", "강사님이 친절해요."]), 
          }
        });
      }
    }
  }

  console.log(`✅ 예약 ${reservationCount}건 생성 완료 (포인트/쿠폰 연동 포함)`);
  console.log("\n✨ 시드 데이터 생성 완료!");
  console.log("   관리자: admin@test.com / test1234");
  console.log("   판매자: seller1@test.com / test1234");
  console.log("   고객: customer1@test.com / test1234");
}

main()
  .catch((e) => {
    console.error("❌ 시드 데이터 생성 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


