import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import classRouter from "./modules/class/class.route.ts";
import reservationRouter from "./modules/reservation/reservation.route.ts";
import centerRouter from "./modules/center/center.route.ts";
import notificationRouter from "./modules/notification/notification.route.ts";
import { logger } from "./middlewares/logger.ts";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.ts";
import authRouter from "./modules/auth/auth.route.ts";
import pointRouter from "./modules/point/point.route.ts";
import reviewRouter from "./modules/review/review.route.ts";
import userRouter from "./modules/user/user.route.ts";
import couponRouter from "./modules/coupon/coupon.route.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 미들웨어
app.use(logger);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 헬스체크
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 라우터
app.use("/api/centers", centerRouter);
app.use("/api/classes", classRouter);
app.use("/api/reservations", reservationRouter);
app.use("/api/points", pointRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/users", userRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/notifications", notificationRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;