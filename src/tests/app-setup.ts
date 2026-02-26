import express from "express";
import cookieParser from "cookie-parser";
import appRouter from "../app.js";

// 테스트를 위한 Express 인스턴스 생성 유틸리티
export function setupTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  
  // 실제 앱 라우터 마운트 (app.ts의 라우트가 이미 /api/auth 등으로 정의됨)
  app.use("/", appRouter);

  return app;
}
