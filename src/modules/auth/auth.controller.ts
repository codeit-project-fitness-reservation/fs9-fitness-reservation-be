import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as authService from './auth.service.ts';
import * as centerService from '../center/center.service.ts';
import { env } from '../../config/env.ts';
import { AppError } from '../../middlewares/errorHandler.ts';
import type { AuthRequest } from '../../middlewares/auth.ts';
import { getFileUrl } from '../../utils/upload/upload.config.ts';

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';

function getProfileImageUrl(req: Request) {
  return getFileUrl(req.file, 'PROFILE');
}

function getCookieOptions(kind: 'access' | 'refresh') {

  const isProd = env.NODE_ENV === 'production';
  const maxAge =
    kind === 'access'
      ? 60 * 60 * 1000 // 1h
      : 14 * 24 * 60 * 60 * 1000; // 2w

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge,
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getCookieOptions('access'));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions('refresh'));
}

function clearAuthCookies(res: Response) {
  // clearCookie는 옵션이 동일해야 브라우저에서 잘 지워지는 경우가 있어, 동일 옵션을 넣어줍니다.
  res.clearCookie(ACCESS_COOKIE_NAME, { ...getCookieOptions('access') });
  res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOptions('refresh') });
}

export async function signupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { center: centerData, ...userData } = req.body;
    
    // 프로필 이미지 처리
    const profileImgUrl = getProfileImageUrl(req);
    if (profileImgUrl) {
      userData.profileImgUrl = profileImgUrl;
    }

    const user = await authService.createUser(userData);

    if (userData.role === 'SELLER' && centerData) {
      await centerService.createCenter(user.id, centerData);
    }

    res.status(201).json({
      success: true,
      data: { ...user },
    });
  } catch (error) {
    next(error);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.signIn(email, password);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({
      success: true,
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const receivedToken = (req as any).cookies?.refreshToken as string | undefined;
    if (!receivedToken) {
      return res.status(401).json({
        success: false,
        error: { message: '리프레시 토큰이 필요합니다' },
      });
    }

    const decoded = jwt.verify(receivedToken, env.JWT_REFRESH_SECRET) as { id: string };
    const refreshed = await authService.refreshToken(decoded.id, receivedToken);
    setAuthCookies(res, refreshed.accessToken, refreshed.refreshToken);

    res.status(200).json({
      success: true,
      data: { refreshed: true },
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      data: { loggedOut: true },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = (req.params.id || (req as AuthRequest).user?.id) as string;
    const user = await authService.getUserById(id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = (req.params.id || (req as AuthRequest).user?.id) as string;
    
    const updateData = { ...req.body };
    const profileImgUrl = getProfileImageUrl(req);

    const user = await authService.updateCustomerProfile(id, updateData, profileImgUrl);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSellerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = (req.params.id || (req as AuthRequest).user?.id) as string;

    const updateData = { ...req.body };
    const profileImgUrl = getProfileImageUrl(req);

    const user = await authService.updateSellerProfile(id, updateData, profileImgUrl);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getUserByIdHandler,
  updateCustomerHandler,
  updateSellerHandler,
};