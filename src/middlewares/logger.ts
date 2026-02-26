import morgan from 'morgan';
import type { Request, Response } from 'express';
import { env } from '../config/env.ts';
import type { AuthRequest } from './auth.ts';

// 커스텀 토큰: 유저 role
morgan.token('user-role', (req: Request) => {
  const authReq = req as AuthRequest;
  return authReq.user?.role || '-';
});

// 개발 환경용 
const devFormat = ':method :url :status :response-time ms [role::user-role] - :res[content-length]';

// 프로덕션 환경용 
const prodFormat = ':method :url :status :response-time ms [role::user-role]';

// 포맷 선택
const format = env.NODE_ENV === 'production' ? prodFormat : devFormat;

// 로거 미들웨어 생성
export const logger = morgan(format, {
  stream: {
    write: (message: string) => {
      console.log(message.trim());
    },
  },
});
