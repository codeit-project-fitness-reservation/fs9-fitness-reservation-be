import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { setupE2EDB, teardownE2EDB, getE2ESeedData } from "./setup.ts";
import app from "../../app.ts";
import prisma from "../../config/prisma.ts";

/** set-cookie 배열을 Cookie 요청 헤더로 변환 */
function toCookieHeader(setCookies) {
  if (!setCookies || !Array.isArray(setCookies)) return "";
  return setCookies.map((c) => c.split(";")[0].trim()).join("; ");
}

beforeAll(async () => {
  await setupE2EDB();
});

afterAll(async () => {
  await teardownE2EDB();
});

describe("E2E API Tests", () => {
  describe("1. POST /api/auth/signup - 회원가입", () => {
    it("DB에 유저가 실제로 생성된다", async () => {
      const unique = Date.now();
      const signupData = {
        email: `e2e-signup-${unique}@test.com`,
        password: "password1234",
        nickname: "E2E회원",
        phone: "01099990000",
        role: "CUSTOMER",
      };

      const res = await request(app)
        .post("/api/auth/signup")
        .send(signupData)
        .set("Content-Type", "application/json");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        email: signupData.email,
        nickname: signupData.nickname,
      });
      expect(res.body.data).not.toHaveProperty("password");

      const created = await prisma.user.findUnique({
        where: { email: signupData.email },
      });
      expect(created).not.toBeNull();
      expect(created?.nickname).toBe(signupData.nickname);
    });
  });

  describe("2. POST /api/auth/login - 로그인", () => {
    it("쿠키 발급 및 accessToken 유효성을 검증한다", async () => {
      const { customer } = getE2ESeedData();
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: customer.email, password: customer.password })
        .set("Content-Type", "application/json");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        email: customer.email,
      });

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieArr = Array.isArray(cookies)
        ? cookies
        : cookies
          ? [cookies]
          : [];
      expect(cookieArr.some((c) => c.includes("accessToken"))).toBe(true);
      expect(cookieArr.some((c) => c.includes("refreshToken"))).toBe(true);
    });
  });

  describe("3. POST /api/reservations - 예약 생성", () => {
    it("DB 상태가 BOOKED로 저장된다", async () => {
      const { customer, slot } = getE2ESeedData();

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: customer.email, password: customer.password });
      const cookies = loginRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/reservations")
        .send({ slotId: slot.id })
        .set("Content-Type", "application/json")
        .set("Cookie", cookies);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("BOOKED");

      const reservationId = res.body.data.id;
      const dbReservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
      });
      expect(dbReservation?.status).toBe("BOOKED");
    });
  });

  describe("4. PATCH /api/reservations/:id/cancel - 예약 취소", () => {
    it("DB 상태가 CANCELED로 변경된다", async () => {
      const { customer, slotForCancel } = getE2ESeedData();

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: customer.email, password: customer.password });
      const cookies = toCookieHeader(loginRes.headers["set-cookie"]);

      const createRes = await request(app)
        .post("/api/reservations")
        .send({ slotId: slotForCancel.id })
        .set("Content-Type", "application/json")
        .set("Cookie", cookies);

      const reservationId = createRes.body.data.id;

      const cancelRes = await request(app)
        .patch(`/api/reservations/${reservationId}/cancel`)
        .send({ cancelNote: "E2E 테스트 취소" })
        .set("Content-Type", "application/json")
        .set("Cookie", cookies);

      expect(cancelRes.status).toBe(200);

      const dbReservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
      });
      expect(dbReservation?.status).toBe("CANCELED");
    });
  });

  describe("5. POST /api/reviews - 리뷰 작성", () => {
    it("DB에 리뷰가 생성된다", async () => {
      const { customer, completedReservation } = getE2ESeedData();
      if (!completedReservation)
        throw new Error("No completed reservation in seed");

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: customer.email, password: customer.password });
      const cookies = toCookieHeader(loginRes.headers["set-cookie"]);

      const res = await request(app)
        .post("/api/reviews")
        .send({
          reservationId: completedReservation.id,
          rating: 5,
          content: "E2E 테스트 리뷰입니다.",
        })
        .set("Content-Type", "application/json")
        .set("Cookie", cookies);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);

      const dbReview = await prisma.review.findFirst({
        where: { reservationId: completedReservation.id },
      });
      expect(dbReview).not.toBeNull();
      expect(dbReview?.content).toBe("E2E 테스트 리뷰입니다.");
    });
  });

  describe("6. GET /api/reviews/class/:classId - 클래스 리뷰 조회", () => {
    it("실제 DB 데이터를 반환한다", async () => {
      const { class: cls } = getE2ESeedData();

      const res = await request(app).get(
        `/api/reviews/class/${cls.id}?page=1&limit=20`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("reviews");
      expect(res.body.data).toHaveProperty("pagination");
      expect(Array.isArray(res.body.data.reviews)).toBe(true);
    });
  });

  describe("7. POST /api/points/admin/adjust - 포인트 지급", () => {
    it("DB pointBalance가 변경된다", async () => {
      const { admin, customer } = getE2ESeedData();
      const beforeUser = await prisma.user.findUnique({
        where: { id: customer.id },
      });
      const balanceBefore = beforeUser?.pointBalance ?? 0;

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: admin.email, password: admin.password });
      const cookies = toCookieHeader(loginRes.headers["set-cookie"]);

      const res = await request(app)
        .post("/api/points/admin/adjust")
        .send({
          userId: customer.id,
          amount: 5000,
          memo: "E2E 이벤트 지급",
        })
        .set("Content-Type", "application/json")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balanceAfter).toBe(balanceBefore + 5000);

      const afterUser = await prisma.user.findUnique({
        where: { id: customer.id },
      });
      expect(afterUser?.pointBalance).toBe(balanceBefore + 5000);
    });
  });

  describe("8. POST /api/coupons/give - 쿠폰 지급", () => {
    it("DB에 UserCoupon이 생성된다", async () => {
      const { admin, customer, couponTemplate } = getE2ESeedData();

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: admin.email, password: admin.password });
      const cookies = toCookieHeader(loginRes.headers["set-cookie"]);

      const beforeCount = await prisma.userCoupon.count({
        where: { userId: customer.id },
      });

      const res = await request(app)
        .post("/api/coupons/give")
        .send({
          userId: customer.id,
          templateId: couponTemplate.id,
        })
        .set("Content-Type", "application/json")
        .set("Cookie", cookies);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const afterCount = await prisma.userCoupon.count({
        where: { userId: customer.id },
      });
      expect(afterCount).toBe(beforeCount + 1);
    });
  });
});
