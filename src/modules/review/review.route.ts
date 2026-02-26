import { Router } from "express";
import * as reviewController from "./review.controller.ts";
import { authenticate } from "../../middlewares/auth.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  createReviewSchema,
  queryReviewSchema,
  updateReviewSchema,
} from "./review.validation.ts";

import { uploadReviewImages } from "../../middlewares/upload.ts";

const router = Router();

// 리뷰 생성
router.post(
  "/",
  authenticate,
  uploadReviewImages,
  validate(createReviewSchema),
  reviewController.createReviewHandler
);

// 센터별 리뷰 조회
router.get(
  "/center/:centerId",
  validate(queryReviewSchema),
  reviewController.getReviewsByCenterHandler
);

// 클래스별 리뷰 조회
router.get(
  "/class/:classId",
  validate(queryReviewSchema),
  reviewController.getReviewsByClassHandler
);

// 내 리뷰 조회
router.get(
  "/my/:reservationId",
  authenticate,
  reviewController.getMyReviewByReservationIdHandler
);

// 리뷰 수정
router.patch(
  "/:reviewId",
  authenticate,
  uploadReviewImages,
  validate(updateReviewSchema),
  reviewController.updateReviewHandler
);

// 리뷰 삭제
router.delete(
  "/:reviewId",
  authenticate,
  reviewController.deleteReviewHandler
);

export default router;