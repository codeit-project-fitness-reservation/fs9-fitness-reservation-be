import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import * as reservationService from "./reservation.service.ts";
import type { AuthRequest } from "../../middlewares/auth.ts";
import type { QueryReservationInput } from "./reservation.validation.ts";
import { AppError } from "../../middlewares/errorHandler.ts";

// POST /reservations 
// 결제 및 예약하기

export async function createReservationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    const newReservation = await reservationService.createReservation(
      authReq.user.id,
      req.body
    );
    res.status(201).json({ success: true, data: newReservation });
  } catch (error) {
    next(error);
  }
}

// GET /reservations 
//  내 예약 조회 (예약중/수강완료)
export async function getMyReservationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    const query = {
      ...req.query,
      userId: authReq.user.id,
    } as QueryReservationInput;
    const result = await reservationService.getReservations(query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// GET /reservations/:id 
// 예약 상세 조회
export async function getMyReservationByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    const id = (req.params as { id: string }).id;
    const reservation = await reservationService.getReservationById(id);
    if (reservation.userId !== authReq.user.id) {
      throw new AppError(403, "본인 예약만 조회할 수 있습니다", "FORBIDDEN");
    }
    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
}

// PATCH /reservations/:id/cancel 
// 예약 취소 및 환불
export async function cancelMyReservationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    const id = (req.params as { id: string }).id;
    const updatedReservation = await reservationService.cancelReservation(
      authReq.user.id,
      id,
      req.body,
      UserRole.CUSTOMER
    );
    res.status(200).json({ success: true, data: updatedReservation });
  } catch (error) {
    next(error);
  }
}

// GET /seller/slots 
// [판매자] 주간 내 클래스 슬롯 조회
export async function getSellerSlotsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.SELLER) {
      throw new AppError(403, "판매자만 접근 가능합니다", "FORBIDDEN");
    } 
    const slots = await reservationService.getSellerSlots(
      authReq.user.id,
      req.query as any
    );
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
}

// GET /seller/reservations 
// [판매자] 내 슬롯에 대한 예약 조회
export async function getSellerReservationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.SELLER) {
      throw new AppError(403, "판매자만 접근 가능합니다", "FORBIDDEN");
    } 
    const result = await reservationService.getSellerReservations(
      authReq.user.id,
      req.query as any
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// GET /seller/reservations/:id
// [판매자] 예약 상세 조회 (결제정보 + 타임라인)
export async function getSellerReservationDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.SELLER) {
      throw new AppError(403, "판매자만 접근 가능합니다", "FORBIDDEN");
    }
    const id = (req.params as { id: string }).id;
    const reservation = await reservationService.getSellerReservationDetail(
      authReq.user.id,
      id
    );
    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
}

// PATCH /seller/reservations/:id/cancel 
// [판매자] 특정 유저 예약 취소
export async function cancelReservationBySellerHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.SELLER) {
      throw new AppError(403, "판매자만 접근 가능합니다", "FORBIDDEN");
    } 
    const id = (req.params as { id: string }).id;
    const updatedReservation =
      await reservationService.cancelReservationBySeller(
        authReq.user.id,
        id,
        req.body
      );
    res.status(200).json({ success: true, data: updatedReservation });
  } catch (error) {
    next(error);
  }
}

// PATCH /reservations/:id/complete   
// [판매자] 예약 완료 처리
export async function completeReservationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.SELLER) {
      throw new AppError(
        403,
        "판매자만 예약 완료 처리할 수 있습니다",
        "FORBIDDEN"
      );
    } 
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : undefined;
    if (!id) {
      throw new AppError(400, "예약 ID가 필요합니다", "INVALID_PARAMS");
    }
    const updatedReservation = await reservationService.completeReservation(
      authReq.user.id,
      id
    );
    res.status(200).json({ success: true, data: updatedReservation });
  } catch (error) {
    next(error);
  }
}

// GET /admin/reservations 
// [관리자] 전체 예약 조회
export async function getAllReservationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.ADMIN) {
      throw new AppError(403, "관리자만 접근 가능합니다", "FORBIDDEN");
    }
    const result = await reservationService.getReservations(req.query as any);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// DELETE /admin/reservations/:id 
// [관리자] 특정 유저 예약 취소
export async function cancelReservationByAdminHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.ADMIN) {
      throw new AppError(403, "관리자만 접근 가능합니다", "FORBIDDEN");
    }
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : undefined;
    if (!id) {
      throw new AppError(400, "예약 ID가 필요합니다", "INVALID_PARAMS");
    }
    const updatedReservation = await reservationService.cancelReservation(
      authReq.user.id,
      id,
      req.body,
      UserRole.ADMIN
    );
    res.status(200).json({ success: true, data: updatedReservation });
  } catch (error) {
    next(error);
  }
}

// GET /admin/reservations/stats 
// [관리자] 최근 한달 예약 횟수 통계
export async function getReservationStatsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.ADMIN) {
      throw new AppError(403, "관리자만 접근 가능합니다", "FORBIDDEN");
    }
    const stats = await reservationService.getReservationStats(
      req.query as any
    );
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
