import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.ts";
import { validate } from "../../middlewares/validate.ts";

import {
  createReservationHandler,
  getMyReservationsHandler,
  getMyReservationByIdHandler,
  cancelMyReservationHandler,
  getSellerSlotsHandler,
  getSellerReservationsHandler,
  getSellerReservationDetailHandler,
  cancelReservationBySellerHandler,
  completeReservationHandler,
  getAllReservationsHandler,
  cancelReservationByAdminHandler,
  getReservationStatsHandler,
} from "./reservation.controller.ts";

import {
  createReservationSchema,
  cancelReservationSchema,
  queryReservationSchema,
  querySellerSlotsSchema,
  queryReservationStatsSchema,
} from "./reservation.validation.ts";

const router = Router();

// POST /reservations 
// [고객] 결제 및 예약하기
router.post(
  "/",
  authenticate,
  requireRole("CUSTOMER", "SELLER"),
  validate(createReservationSchema),
  createReservationHandler
);

// GET /reservations 
// [고객] 내 예약 조회 
router.get(
  "/",
  authenticate,
  requireRole("CUSTOMER", "SELLER"),
  validate(queryReservationSchema),
  getMyReservationsHandler
);

// GET /reservations/:id 
// [고객] 예약 상세 조회
router.get(
  "/:id",
  authenticate,
  requireRole("CUSTOMER", "SELLER"),
  getMyReservationByIdHandler
);

// PATCH /reservations/:id/cancel 
// [고객] 예약 취소 및 환불
router.patch(
  "/:id/cancel",
  authenticate,
  requireRole("CUSTOMER", "SELLER"),
  validate(cancelReservationSchema),
  cancelMyReservationHandler
);

// GET /seller/slots 
// [판매자] 주간 내 클래스 슬롯 조회
router.get(
  "/seller/slots",
  authenticate,
  requireRole("SELLER"),
  validate(querySellerSlotsSchema),
  getSellerSlotsHandler
);

// GET /seller/reservations 
// [판매자] 내 슬롯에 대한 예약 조회
router.get(
  "/seller/reservations",
  authenticate,
  requireRole("SELLER"),
  validate(queryReservationSchema),
  getSellerReservationsHandler
);

// GET /seller/reservations/:id
// [판매자] 예약 상세 조회 (결제정보 + 타임라인)
router.get(
  "/seller/reservations/:id",
  authenticate,
  requireRole("SELLER"),
  getSellerReservationDetailHandler
);

// PATCH /seller/reservations/:id/cancel    
// [판매자] 특정 유저 예약 취소
router.patch(
  "/seller/reservations/:id/cancel",
  authenticate,
  requireRole("SELLER"),
  validate(cancelReservationSchema),
  cancelReservationBySellerHandler
);

// PATCH /reservations/:id/complete   
// [판매자] 예약 완료 처리
router.patch(
  "/:id/complete",
  authenticate,
  requireRole("SELLER"),
  completeReservationHandler
);


// GET /admin/reservations 
// [관리자] 전체 예약 조회
router.get(
  "/admin/reservations",
  authenticate,
  requireRole("ADMIN"),
  validate(queryReservationSchema),
  getAllReservationsHandler
);

// DELETE /admin/reservations/:id 
// [관리자] 특정 유저 예약 취소
router.delete(
  "/admin/reservations/:id",
  authenticate,
  requireRole("ADMIN"),
  validate(cancelReservationSchema),
  cancelReservationByAdminHandler
);

// GET /admin/reservations/stats 
// [관리자] 최근 한달 예약 횟수 통계
router.get(
  "/admin/reservations/stats",
  authenticate,
  requireRole("ADMIN"),
  validate(queryReservationStatsSchema),
  getReservationStatsHandler
);

export default router;
