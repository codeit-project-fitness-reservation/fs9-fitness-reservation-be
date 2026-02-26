import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";

const mockCreateUser = jest.fn();
const mockSignIn = jest.fn();
const mockGetUsers = jest.fn();
const mockGetClasses = jest.fn();
const mockCreateReservation = jest.fn();
const mockAdjustPoints = jest.fn();
const mockGetReviewsByClass = jest.fn();

jest.unstable_mockModule("../../modules/auth/auth.service.ts", () => ({
  createUser: mockCreateUser,
  signIn: mockSignIn,
  refreshToken: jest.fn(),
  signOut: jest.fn(),
  getUserById: jest.fn(),
  updateCustomerProfile: jest.fn(),
  updateSellerProfile: jest.fn(),
}));

jest.unstable_mockModule("../../modules/user/user.service.ts", () => ({
  getUsers: mockGetUsers,
  getUserById: jest.fn(),
  getUserStats: jest.fn(),
  updateUserNote: jest.fn(),
}));

jest.unstable_mockModule("../../modules/class/class.service.ts", () => ({
  getClasses: mockGetClasses,
  getClassById: jest.fn(),
  getClassStats: jest.fn(),
  createClass: jest.fn(),
  updateClass: jest.fn(),
  deleteClass: jest.fn(),
  approveClass: jest.fn(),
  rejectClass: jest.fn(),
  createSlot: jest.fn(),
  updateSlot: jest.fn(),
  deleteSlot: jest.fn(),
  generateSlotsFromSchedule: jest.fn(),
}));

jest.unstable_mockModule("../../modules/reservation/reservation.service.ts", () => ({
  createReservation: mockCreateReservation,
  getReservations: jest.fn(),
  getReservationById: jest.fn(),
  cancelReservation: jest.fn(),
  getSellerSlots: jest.fn(),
  getSellerReservations: jest.fn(),
  getSellerReservationDetail: jest.fn(),
  cancelReservationBySeller: jest.fn(),
  completeReservation: jest.fn(),
  cancelReservationByAdmin: jest.fn(),
  getReservationStats: jest.fn(),
}));

jest.unstable_mockModule("../../modules/point/point.service.ts", () => ({
  getMyBalance: jest.fn(),
  getMyPointHistory: jest.fn(),
  chargePoints: jest.fn(),
  getSellerSettlement: jest.fn(),
  getSellerTransactions: jest.fn(),
  adjustPoints: mockAdjustPoints,
  getAdminPointHistory: jest.fn(),
}));

jest.unstable_mockModule("../../modules/review/review.service.ts", () => ({
  createReview: jest.fn(),
  getReviewsByCenter: jest.fn(),
  getReviewsByClass: mockGetReviewsByClass,
  getMyReviewByReservationId: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
}));

const mockCreateNotification = jest.fn();
const mockListNotifications = jest.fn();
jest.unstable_mockModule("../../modules/notification/notification.service.ts", () => ({
  createNotification: mockCreateNotification,
  listNotifications: mockListNotifications,
  getNotificationById: jest.fn(),
  markNotificationRead: jest.fn(),
  deleteNotificationById: jest.fn(),
}));

jest.unstable_mockModule("../../modules/notification/notification.sse.ts", () => ({
  addClient: jest.fn(),
  publishConnected: jest.fn(),
  publishPing: jest.fn(),
  removeClient: jest.fn(),
}));

jest.unstable_mockModule("../../config/env.ts", () => ({
  env: {
    NODE_ENV: "test",
    JWT_SECRET: "test-jwt-secret",
    JWT_REFRESH_SECRET: "test-jwt-refresh-secret",
    SERVER_URL: "http://localhost:3000",
    UPLOAD_TYPE: "LOCAL",
    AWS_REGION: "",
    AWS_ACCESS_KEY_ID: "",
    AWS_SECRET_ACCESS_KEY: "",
    AWS_BUCKET_NAME: "",
    KAKAO_MAP_REST_API_KEY: "",
  },
}));

const { setupTestApp } = await import("../app-setup.ts");
const app = setupTestApp();

describe("E2E Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Auth API", () => {
    it("POST /api/auth/signup - 회원가입 테스트", async () => {
      const signupData = {
        email: "test@example.com",
        password: "password123",
        nickname: "테스트유저",
        phone: "01012345678",
        role: "CUSTOMER",
      };

      const createdUser = {
        id: "user-1",
        email: signupData.email,
        nickname: signupData.nickname,
        phone: signupData.phone,
        role: signupData.role,
      };

      mockCreateUser.mockResolvedValue(createdUser);

      const res = await request(app)
        .post("/api/auth/signup")
        .send(signupData)
        .set("Content-Type", "application/json");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: createdUser.id,
        email: createdUser.email,
        nickname: createdUser.nickname,
      });
      expect(res.body.data).not.toHaveProperty("password");
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: signupData.email,
          nickname: signupData.nickname,
        })
      );
    });

    it("POST /api/auth/login - 로그인 및 쿠키 반환 테스트", async () => {
      const loginData = {
        email: "test@example.com",
        password: "password123",
      };

      const loginResult = {
        user: {
          id: "user-1",
          email: loginData.email,
          nickname: "테스트유저",
          role: "CUSTOMER",
        },
        accessToken: "access.token.here",
        refreshToken: "refresh.token.here",
      };

      mockSignIn.mockResolvedValue(loginResult);

      const res = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .set("Content-Type", "application/json");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        id: loginResult.user.id,
        email: loginResult.user.email,
      });
      expect(mockSignIn).toHaveBeenCalledWith(
        loginData.email,
        loginData.password
      );

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes("accessToken"))).toBe(true);
      expect(cookies.some((c: string) => c.includes("refreshToken"))).toBe(
        true
      );
    });
  });

  describe("User API", () => {
    it("GET /api/users - 관리자 목록 조회 테스트", async () => {
      const mockUsers = {
        users: [
          {
            id: "user-1",
            email: "admin@example.com",
            nickname: "관리자",
            role: "ADMIN",
            couponCount: 0,
          },
        ],
        totalCount: 1,
      };

      mockGetUsers.mockResolvedValue(mockUsers);

      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign(
        { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        "test-jwt-secret",
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .get("/api/users?page=1&limit=10")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.users[0]).toMatchObject({
        email: mockUsers.users[0].email,
        role: mockUsers.users[0].role,
      });
      expect(res.body.data.totalCount).toBe(1);
      expect(mockGetUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        })
      );
    });
  });

  describe("Class API", () => {
    it("GET /api/classes - 클래스 목록 조회 테스트", async () => {
      const mockClasses = {
        data: [
          {
            id: "class-1",
            title: "요가 클래스",
            category: "요가",
            level: "입문",
            pricePoints: 5000,
            status: "APPROVED",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockGetClasses.mockResolvedValue(mockClasses);

      const res = await request(app)
        .get("/api/classes?page=1&limit=10")
        .set("Content-Type", "application/json");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0]).toMatchObject({
        title: mockClasses.data[0].title,
        category: mockClasses.data[0].category,
      });
      expect(res.body.data.total).toBe(1);
      expect(mockGetClasses).toHaveBeenCalled();
    });
  });

  describe("Reservation API", () => {
    it("POST /api/reservations - 예약 생성 테스트", async () => {
      const reservationData = {
        slotId: "clh3n9k8e0000qzrmn831i7rn",
      };

      const mockReservation = {
        id: "reservation-1",
        userId: "user-1",
        slotId: reservationData.slotId,
        status: "BOOKED",
        pricePoints: 5000,
        paidPoints: 5000,
      };

      mockCreateReservation.mockResolvedValue(mockReservation);

      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign(
        { id: "user-1", email: "user@example.com", role: "CUSTOMER" },
        "test-jwt-secret",
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .post("/api/reservations")
        .send(reservationData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: mockReservation.id,
        status: mockReservation.status,
      });
      expect(mockCreateReservation).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          slotId: reservationData.slotId,
        })
      );
    });
  });

  describe("Point API", () => {
    it("POST /api/points/admin/adjust - 관리자 포인트 지급 테스트", async () => {
      const adjustData = {
        userId: "user-1",
        amount: 1000,
        memo: "이벤트 보상",
      };
      const mockResult = {
        pointHistory: { id: "ph-1", userId: "user-1", amount: 1000, type: "ADMIN" },
        balanceAfter: 1000,
      };
      mockAdjustPoints.mockResolvedValue(mockResult);

      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign(
        { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        "test-jwt-secret",
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .post("/api/points/admin/adjust")
        .send(adjustData)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        pointHistory: expect.objectContaining({ userId: "user-1", amount: 1000 }),
        balanceAfter: 1000,
      });
      expect(mockAdjustPoints).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", amount: 1000, memo: "이벤트 보상" })
      );
    });

    it("POST /api/points/admin/adjust - 비관리자는 403을 반환한다", async () => {
      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign(
        { id: "user-1", email: "user@example.com", role: "CUSTOMER" },
        "test-jwt-secret",
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .post("/api/points/admin/adjust")
        .send({ userId: "user-2", amount: 100, memo: "테스트" })
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Review API", () => {
    it("GET /api/reviews/class/:classId - 클래스별 리뷰 목록 조회 테스트", async () => {
      const mockData = {
        reviews: [
          { id: "review-1", classId: "class-1", rating: 5, content: "좋아요" },
        ],
        pagination: { totalCount: 1, totalPage: 1, currentPage: 1, limit: 20 },
      };
      mockGetReviewsByClass.mockResolvedValue(mockData);

      const res = await request(app)
        .get("/api/reviews/class/class-1")
        .query({ page: 1, limit: 10 })
        .set("Content-Type", "application/json");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviews).toHaveLength(1);
      expect(res.body.data.reviews[0]).toMatchObject({
        classId: "class-1",
        rating: 5,
      });
      expect(mockGetReviewsByClass).toHaveBeenCalledWith(
        "class-1",
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe("Center API", () => {
    it("GET /api/centers/geocode - address 없으면 400을 반환한다", async () => {
      const res = await request(app)
        .get("/api/centers/geocode")
        .set("Content-Type", "application/json");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe("MISSING_ADDRESS");
    });

    it("GET /api/centers/geocode - API 키 미설정 시 503을 반환한다", async () => {
      const res = await request(app)
        .get("/api/centers/geocode")
        .query({ address: "서울시 강남구" })
        .set("Content-Type", "application/json");

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe("GEOCODE_UNAVAILABLE");
    });
  });

  describe("Notification API", () => {
    it("GET /api/notifications - 내 알림 목록 조회 테스트", async () => {
      const mockResult = {
        items: [
          { id: "notif-1", userId: "user-1", title: "제목", body: "내용", isRead: false },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };
      mockListNotifications.mockResolvedValue(mockResult);

      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign(
        { id: "user-1", email: "user@example.com", role: "CUSTOMER" },
        "test-jwt-secret",
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .get("/api/notifications?page=1&limit=20")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        items: expect.any(Array),
        page: 1,
        limit: 20,
      });
      expect(mockListNotifications).toHaveBeenCalled();
    });

    it("POST /api/notifications - 관리자 알림 생성 테스트", async () => {
      const body = { userId: "user-1", title: "공지", body: "내용" };
      const mockNotification = {
        id: "notif-1",
        userId: body.userId,
        title: body.title,
        body: body.body,
        isRead: false,
      };
      mockCreateNotification.mockResolvedValue(mockNotification);

      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign(
        { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        "test-jwt-secret",
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .post("/api/notifications")
        .send(body)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        userId: body.userId,
        title: body.title,
      });
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: body.userId, title: body.title })
      );
    });
  });
});
