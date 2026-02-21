import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.ts";
import * as pointService from "./point.service.ts";
import {
  chargePointSchema,
  queryMyPointHistorySchema,
  querySellerSettlementSchema,
  querySellerTransactionsSchema,
  queryAdminPointHistorySchema,
  type AdjustPointInput,
} from "./point.validation.ts";

// [고객] 내 포인트 잔액 조회
export async function getMyBalanceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const data = await pointService.getMyBalance(authReq.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// [고객] 내 포인트 내역 조회
export async function getMyPointHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const query = queryMyPointHistorySchema.parse(req.query);
    const data = await pointService.getMyPointHistory(authReq.user.id, query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// [고객] 포인트 충전
export async function chargePointHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const body = chargePointSchema.parse(req.body);
    const data = await pointService.chargePoints(authReq.user.id, body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}


// [판매자] 매출 정산 요약 + 클래스별 매출
export async function getSellerSettlementHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const query = querySellerSettlementSchema.parse(req.query);
    const data = await pointService.getSellerSettlement(authReq.user.id, query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// [판매자] 거래 내역 조회
export async function getSellerTransactionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const query = querySellerTransactionsSchema.parse(req.query);
    const data = await pointService.getSellerTransactions(
      authReq.user.id,
      query,
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// [관리자] 포인트 지급/회수
export async function adjustPointHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = req.body as AdjustPointInput;
    const data = await pointService.adjustPoints(body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// [관리자] 전체 포인트 내역 조회
export async function getAdminPointHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = queryAdminPointHistorySchema.parse(req.query);
    const data = await pointService.getAdminPointHistory(query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
