import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import {
  getStorage,
  imageFileFilter,
  MAX_FILE_SIZE,
} from '../utils/upload/upload.config.ts';

// ──────────────────────────────────────────────
// 클래스 이미지 업로드
// ──────────────────────────────────────────────
const classUpload = multer({
  storage: getStorage('CLASS'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 3 },
});

export const uploadClassImages = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  classUpload.array('images', 3)(req, res, (err: any) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
};

// ──────────────────────────────────────────────
// 프로필 이미지 업로드
// ──────────────────────────────────────────────
const profileUpload = multer({
  storage: getStorage('PROFILE'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

export const uploadProfileImage = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  profileUpload.single('profileImage')(req, res, (err: any) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
};

// ──────────────────────────────────────────────
// 리뷰 이미지 업로드
// ──────────────────────────────────────────────
const reviewUpload = multer({
  storage: getStorage('REVIEW'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 3 },
});

export const uploadReviewImages = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  reviewUpload.array('images', 3)(req, res, (err: any) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
};

// ──────────────────────────────────────────────
// 공통 에러 핸들러
// ──────────────────────────────────────────────
export const handleUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { message: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 가능합니다` },
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: { message: '업로드 가능한 파일 개수를 초과했습니다' },
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: { message: '예상치 못한 필드 이름입니다' },
      });
    }
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: { message: error.message || '파일 업로드 중 오류가 발생했습니다' },
    });
  }

  next();
};
