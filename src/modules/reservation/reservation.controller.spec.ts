import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./reservation.service.ts", () => ({
  createReservation: jest.fn(),
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

const reservationController = await import("./reservation.controller.ts");
const reservationService = await import("./reservation.service.ts");

describe("Reservation Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: "user-id", role: UserRole.CUSTOMER },
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("createReservationHandler", () => {
    it("사용자가 성공적으로 예약을 생성할 수 있어야 한다", async () => {
      req.body = { slotId: "slot-123" };
      const mockReservation = {
        id: "reservation-1",
        userId: "user-id",
        slotId: "slot-123",
        status: "BOOKED",
        pricePoints: 5000,
        paidPoints: 5000,
      };
      (reservationService.createReservation as jest.Mock).mockResolvedValue(
        mockReservation
      );

      await reservationController.createReservationHandler(
        req as Request,
        res as Response,
        next
      );

      expect(reservationService.createReservation).toHaveBeenCalledWith(
        "user-id",
        { slotId: "slot-123" }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReservation,
      });
    });
  });
});
