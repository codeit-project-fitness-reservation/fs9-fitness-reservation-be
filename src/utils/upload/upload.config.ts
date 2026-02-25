import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { Request } from 'express';
import { env } from '../../config/env.ts';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

// 타입별 하위 경로
export const UPLOAD_PATHS = {
  CLASS: path.join(UPLOAD_DIR, 'classes'),
  PROFILE: path.join(UPLOAD_DIR, 'profiles'),
  REVIEW: path.join(UPLOAD_DIR, 'reviews'),
} as const;

const S3_SUBDIRS = { CLASS: 'classes', PROFILE: 'profiles', REVIEW: 'reviews' } as const;
export type UploadPathKey = keyof typeof UPLOAD_PATHS;

// 로컬일 때만 디렉토리 생성
if (process.env.UPLOAD_TYPE !== 'S3') {
  [UPLOAD_DIR, ...Object.values(UPLOAD_PATHS)].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 로컬
export const createStorage = (uploadPath: string) => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return multer.diskStorage({
    destination: (_req: Request, _file, cb) => cb(null, uploadPath),
    filename: (_req: Request, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      const basename = path.basename(file.originalname, ext);
      const safeBasename = basename.replace(/[^a-zA-Z0-9가-힣]/g, '_').substring(0, 50);
      cb(null, `${safeBasename}-${uniqueSuffix}${ext}`);
    },
  });
};

// S3 
let s3Client: S3Client | null = null;
function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export const createS3Storage = (subDir: string) => {
  return multerS3({
    s3: getS3Client(),
    bucket: env.AWS_BUCKET_NAME,
    key: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      const basename = path.basename(file.originalname, ext);
      const safeBasename = basename.replace(/[^a-zA-Z0-9가-힣]/g, '_').substring(0, 50);
      cb(null, `${subDir}/${safeBasename}-${uniqueSuffix}${ext}`);
    },
  });
};

// UPLOAD_TYPE에 따라 로컬 | S3 스토리지
export const getStorage = (pathKey: UploadPathKey) => {
  if (env.UPLOAD_TYPE === 'S3') {
    return createS3Storage(S3_SUBDIRS[pathKey]);
  }
  return createStorage(UPLOAD_PATHS[pathKey]);
};

export const getFileUrl = (
  file: Express.Multer.File | undefined,
  pathKey: UploadPathKey
): string | undefined => {
  if (!file) return undefined;
  const s3File = file as Express.Multer.File & { location?: string };
  if (env.UPLOAD_TYPE === 'S3' && s3File.location) return s3File.location;
  const subDir = S3_SUBDIRS[pathKey];
  return `${env.SERVER_URL}/uploads/${subDir}/${file.filename}`;
};

export const getFileUrls = (
  files: Express.Multer.File[] | undefined,
  pathKey: UploadPathKey
): string[] => {
  if (!files || !Array.isArray(files)) return [];
  return files.map((f) => getFileUrl(f, pathKey)!).filter(Boolean);
};

// 이미지 필터
export const imageFileFilter = (
  req: Request,
  file: any,
  cb: any
): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(`허용되지 않는 파일 형식입니다. 허용 형식: ${ALLOWED_EXTENSIONS.join(', ')}`)
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return cb(new Error('허용되지 않는 MIME 타입입니다'));
  }

  cb(null, true);
};

// 로컬 파일 삭제
export const deleteFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('파일 삭제 실패:', error);
  }
};

// URL → 로컬 경로
export const getFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const filepath = path.join(__dirname, '../../..', urlObj.pathname);
    return filepath;
  } catch {
    return null;
  }
};
