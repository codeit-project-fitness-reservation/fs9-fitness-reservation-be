import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.ts';

// 커스텀 에러 클래스
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Prisma 에러 처리
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  code?: string;
} {
  switch (error.code) {
    case 'P2002':
      // 필드가 중복될 때
      const field = error.meta?.target as string[] | undefined;
      const fieldName = field ? field.join(', ') : '필드';
      return {
        statusCode: 409,
        message: `${fieldName}이(가) 이미 존재합니다`,
        code: 'DUPLICATE_ENTRY',
      };
    case 'P2025':
      // 데이터를 찾을 수 없을 때
      return {
        statusCode: 404,
        message: '요청한 리소스를 찾을 수 없습니다',
        code: 'NOT_FOUND',
      };
    case 'P2003':
      // 참조하는 데이터가 존재하지 않을 때
      return {
        statusCode: 400,
        message: '관련된 데이터가 존재하지 않습니다',
        code: 'FOREIGN_KEY_CONSTRAINT',
      };
    case 'P2014':
      // 필수 관계 데이터가 없을 때
      return {
        statusCode: 400,
        message: '필수 관계 데이터가 누락되었습니다',
        code: 'REQUIRED_RELATION',
      };
    default:
      return {
        statusCode: 500,
        message: '데이터베이스 오류가 발생했습니다',
        code: 'DATABASE_ERROR',
      };
  }
}

// Zod 에러 처리
function handleZodError(error: ZodError): {
  statusCode: number;
  message: string;
  details?: string;
} {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });

  return {
    statusCode: 400,
    message: '요청 데이터가 유효하지 않습니다',
    details: issues.join(', '),
  };
}

// JWT 에러 처리
function handleJWTError(error: Error): {
  statusCode: number;
  message: string;
  code?: string;
} {
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: '유효하지 않은 토큰입니다',
      code: 'INVALID_TOKEN',
    };
  }
  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: '토큰이 만료되었습니다',
      code: 'TOKEN_EXPIRED',
    };
  }
  return {
    statusCode: 401,
    message: '인증 오류가 발생했습니다',
    code: 'AUTH_ERROR',
  };
}

// 메인 에러 핸들러 미들웨어
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = '서버 오류가 발생했습니다';
  let code: string | undefined;
  let details: string | undefined;

  // AppError 인스턴스인 경우
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  }
  // Prisma 에러인 경우
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    code = prismaError.code;
  }
  // Prisma validation 에러인 경우
  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = '요청 데이터가 유효하지 않습니다';
    code = 'VALIDATION_ERROR';
  }
  // Zod 에러인 경우
  else if (error instanceof ZodError) {
    const zodError = handleZodError(error);
    statusCode = zodError.statusCode;
    message = zodError.message;
    details = zodError.details;
  }
  // JWT 에러인 경우
  else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    const jwtError = handleJWTError(error);
    statusCode = jwtError.statusCode;
    message = jwtError.message;
    code = jwtError.code;
  }
  else {
    if (env.NODE_ENV === 'development') {
      details = error.message;
      console.error('Error:', error);
    }
  }
  if (statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}`);
    console.error(error); 
  }

  const errorResponse: {
    success: false;
    error: {
      message: string;
      code?: string;
      details?: string;
      stack?: string;
    };
  } = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details && { details }),
      // 개발 환경에서만 스택 트레이스 제공
      ...(env.NODE_ENV === 'development' && error.stack && { stack: error.stack }),
    },
  };

  res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    404,
    `경로 ${req.originalUrl}을(를) 찾을 수 없습니다`,
    'NOT_FOUND'
  );
  next(error);
}
