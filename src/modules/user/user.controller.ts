import type { Request, Response, NextFunction } from "express";
import * as userService from "./user.service.ts";

import { AppError } from "../../middlewares/errorHandler.ts";
import type { AuthRequest } from "../../middlewares/auth.ts";

import { UserRole } from "@prisma/client";

// GET /users - 회원 목록 조회 (관리자)
export async function getUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const role = req.query.role as string | undefined;
    const searchType = req.query.searchType as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await userService.getUsers({
      page,
      limit,
      role,
      searchType,
      search,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// GET /users/stats - 회원 통계 조회 (관리자)
export async function getUserStatsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stats = await userService.getUserStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

// GET /users/:id - 회원 상세 조회 (관리자 or 본인)
export async function getUserByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }

    if (!id || typeof id !== "string") {
      throw new AppError(400, "회원 ID가 필요합니다", "MISSING_USER_ID");
    }

    // 관리자가 아니고, 본인 ID도 아닌 경우 접근 불가
    if (authReq.user.role !== UserRole.ADMIN && authReq.user.id !== id) {
      throw new AppError(403, "권한이 없습니다", "FORBIDDEN");
    }

    const user = await userService.getUserById(id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /users/:id/note - 회원 메모만 수정 (관리자 전용)
export async function patchUserNoteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { note } = req.body as { note?: string | null };

    if (!authReq.user) {
      throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
    }
    if (authReq.user.role !== UserRole.ADMIN) {
      throw new AppError(403, "권한이 없습니다", "FORBIDDEN");
    }
    if (!id || typeof id !== "string") {
      throw new AppError(400, "회원 ID가 필요합니다", "MISSING_USER_ID");
    }
    if (note === undefined) {
      throw new AppError(400, "메모 값을 입력해주세요", "MISSING_NOTE");
    }

    const data = await userService.updateUserNote(id, note);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}


