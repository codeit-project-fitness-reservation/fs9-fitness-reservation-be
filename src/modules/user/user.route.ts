import { Router } from "express";
import { getUsersHandler, getUserStatsHandler, getUserByIdHandler, patchUserNoteHandler } from "./user.controller.ts";
import { validate } from "../../middlewares/validate.ts";
import { getUsersSchema, patchUserNoteSchema } from "./user.validation.ts";
import { authenticate, requireRole } from "../../middlewares/auth.ts";
import { UserRole } from "@prisma/client";

const router = Router();

// GET /users/stats - 회원 통계 조회 (ADMIN)
router.get("/stats", authenticate, requireRole(UserRole.ADMIN), getUserStatsHandler);

// GET /users - 회원 목록 조회 (ADMIN)
router.get(
  "/",
  authenticate,
  requireRole(UserRole.ADMIN),
  validate(getUsersSchema),
  getUsersHandler
);

// GET /users/:id - 회원 상세 조회 (ADMIN or 본인)
router.get("/:id", authenticate, getUserByIdHandler);

// PATCH /users/:id/note - 회원 메모 수정 (ADMIN)
router.patch(
  "/:id/note",
  authenticate,
  requireRole(UserRole.ADMIN),
  validate(patchUserNoteSchema),
  patchUserNoteHandler,
);

export default router;
