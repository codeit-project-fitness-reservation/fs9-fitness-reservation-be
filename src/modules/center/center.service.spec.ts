import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { AppError } from "../../middlewares/errorHandler.ts";

jest.unstable_mockModule("./center.repository.ts", () => ({
  findCenterByOwnerId: jest.fn(),
  createCenter: jest.fn(),
  findManycenters: jest.fn(),
  countCenters: jest.fn(),
  findCenterById: jest.fn(),
  findCenterSimple: jest.fn(),
  updateCenter: jest.fn(),
  updateCenterWithTx: jest.fn(),
}));

const centerService = await import("./center.service.ts");
const centerRepository = await import("./center.repository.ts");

describe("Center Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCenter", () => {
    it("이미 센터를 소유하고 있는 경우 409 에러를 던져야 한다", async () => {
      (centerRepository.findCenterByOwnerId as jest.Mock).mockResolvedValue({ id: "1" });
      await expect(centerService.createCenter("user-1", { name: "test", address1: "test" })).rejects.toThrow(AppError);
    });

    it("센터 생성 시 성공적으로 데이터를 반환해야 한다", async () => {
      (centerRepository.findCenterByOwnerId as jest.Mock).mockResolvedValue(null);
      (centerRepository.createCenter as jest.Mock).mockResolvedValue({ id: "1", name: "test" });
      const result = await centerService.createCenter("user-1", { name: "test", address1: "test" });
      expect(result.id).toBe("1");
    });
  });

  describe("getCenterById", () => {
    it("존재하지 않는 센터 조회 시 404 에러를 던져야 한다", async () => {
      (centerRepository.findCenterById as jest.Mock).mockResolvedValue(null);
      await expect(centerService.getCenterById("none")).rejects.toThrow(AppError);
    });

    it("정상적으로 센터 정보를 반환해야 한다", async () => {
      (centerRepository.findCenterById as jest.Mock).mockResolvedValue({ id: "1" });
      const result = await centerService.getCenterById("1");
      expect(result.id).toBe("1");
    });
  });
});
