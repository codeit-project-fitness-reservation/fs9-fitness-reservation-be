import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.ts";
import * as centerService from "./center.service.ts";
import { env } from "../../config/env.ts";
import { AppError } from "../../middlewares/errorHandler.ts";

// GET /centers/geocode?address=도로명주소
export async function geocodeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const address = (req.query.address as string)?.trim();
    if (!address) {
      throw new AppError(400, "address 쿼리가 필요합니다", "MISSING_ADDRESS");
    }
    const key = env.KAKAO_MAP_REST_API_KEY;
    if (!key) {
      throw new AppError(
        503,
        "지오코딩 서비스를 사용할 수 없습니다 (API 키 미설정)",
        "GEOCODE_UNAVAILABLE",
      );
    }
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    if (!resp.ok) {
      throw new AppError(502, "주소 검색 API 오류", "GEOCODE_API_ERROR");
    }
    const json = (await resp.json()) as {
      documents?: Array<{ address?: { x: string; y: string } }>;
    };
    const doc = json.documents?.[0];
    const coords = doc?.address;
    if (!coords?.x || !coords?.y) {
      throw new AppError(404, "해당 주소의 좌표를 찾을 수 없습니다", "GEOCODE_NOT_FOUND");
    }
    const lng = parseFloat(coords.x);
    const lat = parseFloat(coords.y);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new AppError(502, "좌표 파싱 오류", "GEOCODE_PARSE_ERROR");
    }
    res.status(200).json({ success: true, data: { lat, lng } });
  } catch (error) {
    next(error);
  }
}

// 내 센터 조회 (SELLER 전용)
// GET /centers/me
export async function getMyCenterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    const center = await centerService.getMyCenter(authReq.user.id);
    res.status(200).json({ success: true, data: center });
  } catch (error) {
    next(error);
  }
}

// 센터 목록 조회 핸들러
// GET /centers
export async function getCentersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await centerService.getCenters(req.query as any);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// 센터 상세 조회 핸들러
// GET /centers/:id
export async function getCenterByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const centerData = await centerService.getCenterById(id as string);

    res.status(200).json({ success: true, data: centerData });
  } catch (error) {
    next(error);
  }
}

// 센터 수정 핸들러
// PATCH /centers/:id
export async function updateCenterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res
        .status(401)
        .json({ success: false, error: { message: "인증이 필요합니다" } });
      return;
    }

    const { id } = req.params;

    const updatedCenter = await centerService.updateCenter(
      authReq.user.id,
      id as string,
      req.body,
    );

    res.status(200).json({ success: true, data: updatedCenter });
  } catch (error) {
    next(error);
  }
}
