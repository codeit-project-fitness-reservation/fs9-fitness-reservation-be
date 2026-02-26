import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { AppError } from "../../middlewares/errorHandler.ts";

jest.unstable_mockModule("./reservation.repository.ts", () => ({
  findSlotWithClass: jest.fn(),
  findUserWithPoint: jest.fn(),
  increaseSlotCurrentReservation: jest.fn(),
  findUserCouponById: jest.fn(),
  findManyReservations: jest.fn(),
  countReservations: jest.fn(),
  findReservationById: jest.fn(),
}));

jest.unstable_mockModule("../point/point.service.ts", () => ({
  usePoints: jest.fn(),
}));

jest.unstable_mockModule("../../config/prisma.ts", () => ({
  default: { $transaction: jest.fn() },
}));

const reservationService = await import("./reservation.service.ts");
const reservationRepository = await import("./reservation.repository.ts");

describe("Reservation Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createReservation", () => {
    const futureDate = new Date(Date.now() + 86400000);

    const mockSlot = {
      id: "slot-1",
      currentReservation: 5,
      capacity: 10,
      isOpen: true,
      startAt: futureDate,
      class: { id: "class-1", pricePoints: 5000, status: "APPROVED" },
    };

    it("슬롯을 찾을 수 없으면 404 에러를 던져야 한다", async () => {
      jest.mocked(reservationRepository.findSlotWithClass).mockResolvedValue(null);

      await expect(
        reservationService.createReservation("user-1", { slotId: "slot-none" })
      ).rejects.toMatchObject({ statusCode: 404, code: "SLOT_NOT_FOUND" });
    });

    it("마감된 슬롯은 예약할 수 없다", async () => {
      jest.mocked(reservationRepository.findSlotWithClass).mockResolvedValue({
        ...mockSlot, isOpen: false,
      } as any);

      await expect(
        reservationService.createReservation("user-1", { slotId: "slot-1" })
      ).rejects.toMatchObject({ statusCode: 400, code: "SLOT_CLOSED" });
    });

    it("정원이 초과된 클래스에는 예약을 생성할 수 없다", async () => {
      jest.mocked(reservationRepository.findSlotWithClass).mockResolvedValue({
        ...mockSlot, currentReservation: 10, capacity: 10,
      } as any);

      await expect(
        reservationService.createReservation("user-1", { slotId: "slot-1" })
      ).rejects.toMatchObject({ statusCode: 400, code: "SLOT_FULL" });
    });

    it("승인되지 않은 클래스는 예약할 수 없다", async () => {
      jest.mocked(reservationRepository.findSlotWithClass).mockResolvedValue({
        ...mockSlot, class: { ...mockSlot.class, status: "PENDING" },
      } as any);

      await expect(
        reservationService.createReservation("user-1", { slotId: "slot-1" })
      ).rejects.toMatchObject({ statusCode: 400, code: "CLASS_NOT_APPROVED" });
    });

    it("포인트가 부족하면 예약을 생성할 수 없다", async () => {
      jest.mocked(reservationRepository.findSlotWithClass).mockResolvedValue(mockSlot as any);
      jest.mocked(reservationRepository.findUserWithPoint).mockResolvedValue({
        id: "user-1",
        pointBalance: 100, // 클래스 가격 5000보다 적음
      } as any);

      await expect(
        reservationService.createReservation("user-1", { slotId: "slot-1" })
      ).rejects.toMatchObject({ statusCode: 400, code: "INSUFFICIENT_POINTS" });
    });
  });

  describe("getReservationById", () => {
    it("존재하지 않는 예약 조회 시 404 에러를 던져야 한다", async () => {
      jest.mocked(reservationRepository.findReservationById).mockResolvedValue(null);

      await expect(
        reservationService.getReservationById("res-none")
      ).rejects.toMatchObject({ statusCode: 404, code: "RESERVATION_NOT_FOUND" });
    });

    it("존재하는 예약 조회 시 데이터를 반환해야 한다", async () => {
      jest.mocked(reservationRepository.findReservationById).mockResolvedValue({
        id: "res-1",
        status: "BOOKED",
      } as any);

      const result = await reservationService.getReservationById("res-1");
      expect(result.id).toBe("res-1");
    });
  });
});
