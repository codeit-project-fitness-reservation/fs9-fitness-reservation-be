import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  geocodeHandler,
  getMyCenterHandler,
  getCentersHandler,
  getCenterByIdHandler,
  updateCenterHandler,
} from "./center.controller.ts";
import { updateCenterSchema, queryCenterSchema } from "./center.validation.ts";

const router = Router();

// GET /centers/me - 내 센터 조회 (SELLER 전용)
router.get("/me", authenticate, requireRole("SELLER"), getMyCenterHandler);

// GET /centers - 센터 목록 조회
router.get("/", validate(queryCenterSchema), getCentersHandler);

// GET /centers/geocode?address=... - 주소 → 위경도 (비인증 가능)
router.get("/geocode", geocodeHandler);

// GET /centers/:id - 센터 상세 조회
router.get("/:id", getCenterByIdHandler);

// PATCH /centers/:id - 센터 수정
router.patch(
  "/:id",
  authenticate,
  requireRole("SELLER"),
  validate(updateCenterSchema),
  updateCenterHandler,
);

export default router;
