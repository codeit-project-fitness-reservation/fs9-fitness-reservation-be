import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`필수 환경변수 ${key}가 설정되지 않았습니다.`);
    process.exit(1);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3000',
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '6h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '14d',
  
  // 업로드 설정
  UPLOAD_TYPE: (process.env.UPLOAD_TYPE || 'LOCAL') as 'LOCAL' | 'S3',
  AWS_REGION: process.env.AWS_REGION || '',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || '',

  SERVER_URL: process.env.SERVER_URL || `http://localhost:${process.env.PORT || '3000'}`,
};
