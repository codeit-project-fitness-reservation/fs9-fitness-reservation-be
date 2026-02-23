import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { AppError } from "../../middlewares/errorHandler.ts";
import { UserRole } from "@prisma/client";

jest.unstable_mockModule("./class.repository.ts", () => ({
  createClass: jest.fn(),
  findClassById: jest.fn(),
  updateClass: jest.fn(),
  deleteClass: jest.fn(),
  findCenterById: jest.fn(),
  findCenterByOwnerId: jest.fn(),
  findClassWithCenter: jest.fn(),
  approveClass: jest.fn(),
  rejectClass: jest.fn(),
  createSlot: jest.fn(),
  updateSlot: jest.fn(),
  deleteSlot: jest.fn(),
  deleteSlotsByClassId: jest.fn(),
  generateSlotsFromSchedule: jest.fn(),
  getClassStats: jest.fn(),
  getClasses: jest.fn(),
}));

jest.unstable_mockModule("../reservation/reservation.service.ts", () => ({
  cancelReservationsByClassChange: jest.fn(),
}));

const classService = await import("./class.service.ts");
const classRepository = await import("./class.repository.ts");

describe("Class Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createClass", () => {
    it("판매자는 본인의 센터에 클래스를 생성할 수 있다", async () => {
      (classRepository.findCenterByOwnerId as jest.Mock).mockResolvedValue({
        id: "center-1",
        ownerId: "user-1",
      });
      (classRepository.createClass as jest.Mock).mockResolvedValue({
        id: "class-1",
        name: "test-class",
      });

      const result = await classService.createClass("user-1", {
        centerId: "center-1",
        name: "test-class",
      } as any);

      expect(result.id).toBe("class-1");
      expect(classRepository.createClass).toHaveBeenCalled();
    });

    it("센터가 없으면 CENTER_NOT_FOUND 에러를 발생시킨다", async () => {
      (classRepository.findCenterByOwnerId as jest.Mock).mockResolvedValue(null);

      await expect(
        classService.createClass("user-1", {
          centerId: "center-1",
          name: "test-class",
        } as any)
      ).rejects.toThrow(AppError);
    });
  });

  describe("deleteClass", () => {
    it("성공적으로 클래스를 (소프트) 삭제할 수 있어야 한다", async () => {
      (classRepository.findClassWithCenter as jest.Mock).mockResolvedValue({
        id: "class-1",
        center: { ownerId: "user-1" },
      });
      (classRepository.deleteClass as jest.Mock).mockResolvedValue(undefined);
      (classRepository.deleteSlotsByClassId as jest.Mock).mockResolvedValue(
        undefined
      );

      const reservationService = await import(
        "../reservation/reservation.service.ts"
      );
      (
        reservationService.cancelReservationsByClassChange as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await classService.deleteClass(
        "user-1",
        "class-1",
        UserRole.SELLER
      );

      expect(result).toEqual({ message: "클래스가 삭제되었습니다" });
      expect(classRepository.deleteClass).toHaveBeenCalledWith("class-1");
    });
  });
});
