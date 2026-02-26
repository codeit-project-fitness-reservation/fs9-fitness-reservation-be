import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from "../../middlewares/auth.ts";
import { validate } from "../../middlewares/validate.ts";
import { uploadClassImages } from "../../middlewares/upload.ts";

import {
  createClassHandler,
  getClassesHandler,
  getClassStatsHandler,
  getClassByIdHandler,
  updateClassHandler,
  deleteClassHandler,
  approveClassHandler,
  rejectClassHandler,
  createSlotHandler,
  updateSlotHandler,
  deleteSlotHandler,
  generateSlotsHandler,
} from "./class.controller.ts";

import {
  createClassSchema,
  updateClassSchema,
  queryClassSchema,
  approveClassSchema,
  rejectClassSchema,
  createSlotSchema,
  updateSlotSchema,
  generateSlotsSchema,
} from "./class.validation.ts";

const router = Router();

// GET /classes/stats - 클래스 통계 조회 (관리자)
router.get(
  "/stats",
  authenticate,
  requireRole("ADMIN"),
  getClassStatsHandler,
);

// GET /classes - 클래스 목록 조회 
router.get(
  "/",
  optionalAuthenticate,
  validate(queryClassSchema),
  getClassesHandler,
);

// GET /classes/:id - 클래스 상세 조회 
router.get("/:id", optionalAuthenticate, getClassByIdHandler);

// POST /classes - 클래스 생성 (판매자, 인증 필요)
router.post(
  "/",
  authenticate,
  requireRole("SELLER"),
  uploadClassImages,
  validate(createClassSchema),
  createClassHandler,
);

// PATCH /classes/:id - 클래스 수정 (판매자, 인증 필요)
router.patch(
  "/:id",
  authenticate,
  requireRole("SELLER"),
  uploadClassImages,
  validate(updateClassSchema),
  updateClassHandler,
);

// DELETE /classes/:id - 클래스 삭제 (판매자 또는 관리자)
router.delete(
  "/:id",
  authenticate,
  requireRole("SELLER", "ADMIN"),
  deleteClassHandler
);

// PATCH /classes/:id/approve - 클래스 승인 (관리자, 인증 필요)
router.patch(
  "/:id/approve",
  authenticate,
  requireRole("ADMIN"),
  validate(approveClassSchema),
  approveClassHandler,
);

// PATCH /classes/:id/reject - 클래스 반려 (관리자, 인증 필요)
router.patch(
  "/:id/reject",
  authenticate,
  requireRole("ADMIN"),
  validate(rejectClassSchema),
  rejectClassHandler,
);

// POST /classes/:id/slots - 슬롯 생성 (판매자, 인증 필요)
router.post(
  "/:id/slots",
  authenticate,
  requireRole("SELLER"),
  validate(createSlotSchema),
  createSlotHandler,
);


// PATCH /classes/:classId/slots/:slotId - 슬롯 수정 (판매자, 인증 필요)
router.patch(
  "/:classId/slots/:slotId",
  authenticate,
  requireRole("SELLER"),
  validate(updateSlotSchema),
  updateSlotHandler,
);

// DELETE /classes/:classId/slots/:slotId - 슬롯 삭제 (판매자, 인증 필요)
router.delete(
  "/:classId/slots/:slotId",
  authenticate,
  requireRole("SELLER"),
  deleteSlotHandler,
);

// POST /classes/:id/slots/generate - 스케줄 기반 슬롯 자동 생성 (판매자, 인증 필요)
router.post(
  "/:id/slots/generate",
  authenticate,
  requireRole("SELLER"),
  validate(generateSlotsSchema),
  generateSlotsHandler,
);

export default router;
