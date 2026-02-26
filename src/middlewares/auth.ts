import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env.ts";
import { AppError } from "./errorHandler.ts";

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// 선택 인증: 토큰이 있으면 req.user 세팅, 없으면 그냥 통과
export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;

    let token = cookieToken;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) return next();

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
    };

    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    next();
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;

    let token = cookieToken;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) {
      throw new AppError(401, "인증 토큰이 필요합니다");
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
    };

    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}


export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;

      if (!authReq.user) {
        throw new AppError(401, "인증이 필요합니다", "AUTHENTICATION_REQUIRED");
      }

      if (!allowedRoles.includes(authReq.user.role)) {
        throw new AppError(403, "권한이 없습니다", "FORBIDDEN");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
