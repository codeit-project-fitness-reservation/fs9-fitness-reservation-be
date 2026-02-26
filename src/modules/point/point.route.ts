import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  chargePointSchema,
  chargeConfirmSchema,
  queryMyPointHistorySchema,
  adjustPointSchema,
  queryAdminPointHistorySchema,
  querySellerSettlementSchema,
  querySellerTransactionsSchema,
} from "./point.validation.ts";
import {
  getMyBalanceHandler,
  getMyPointHistoryHandler,
  chargePointHandler,
  chargeConfirmHandler,
  adjustPointHandler,
  getAdminPointHistoryHandler,
  getSellerSettlementHandler,
  getSellerTransactionsHandler,
} from "./point.controller.ts";

const router = Router();

// 내 포인트 잔액 조회
router.get("/me", authenticate, getMyBalanceHandler);

// 내 포인트 내역 조회
router.get(
  "/me/history",
  authenticate,
  validate(queryMyPointHistorySchema),
  getMyPointHistoryHandler
);

// 포인트 충전 (테스트/직접 호출용)
router.post(
  "/charge",
  authenticate,
  requireRole("CUSTOMER", "SELLER"),
  validate(chargePointSchema),
  chargePointHandler
);

// 토스 승인 + 포인트 충전 
router.post(
  "/charge/confirm",
  authenticate,
  requireRole("CUSTOMER", "SELLER"),
  validate(chargeConfirmSchema),
  chargeConfirmHandler
);

// 매출 정산 요약 + 클래스별 매출
router.get(
  "/seller/settlement",
  authenticate,
  requireRole("SELLER"),
  validate(querySellerSettlementSchema),
  getSellerSettlementHandler
);

// 거래 내역 조회
router.get(
  "/seller/transactions",
  authenticate,
  requireRole("SELLER"),
  validate(querySellerTransactionsSchema),
  getSellerTransactionsHandler
);


// 포인트 지급/회수
router.post(
  "/admin/adjust",
  authenticate,
  requireRole("ADMIN"),
  validate(adjustPointSchema),
  adjustPointHandler
);

// 전체 포인트 내역 조회
router.get(
  "/admin/history",
  authenticate,
  requireRole("ADMIN"),
  validate(queryAdminPointHistorySchema),
  getAdminPointHistoryHandler
);

export default router;
