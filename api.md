# FitMatch Backend API 명세서

프론트엔드 개발을 위한 백엔드 API 명세 문서입니다.

## 📌 공통 사항

### 기본 URL
`http://localhost:3000/api`

### 헬스체크 (Health Check)
API 경로와 별도로 서버 상태 확인용 엔드포인트가 있습니다.
- **URL**: `GET /health` (루트, `/api` 접두사 없음)
- **Response**: `200 OK` — `{ "status": "ok", "timestamp": "..." }`

### 인증 (Authorization)
로그인이 필요한 API 호출 시 HTTP Header에 토큰을 포함해야 합니다.
```
Authorization: Bearer <accessToken>
```

### 응답 포맷 (Response Format)

**성공 시 (Success)**
```json
{
  "success": true,
  "data": { ... } // 실제 데이터 또는 null
}
```

**실패 시 (Error)**
HTTP Status Code와 함께 다음 에러 객체를 반환합니다.
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "사용자에게 보여줄 에러 메시지"
  }
}
```

### 페이징 응답 (Paging)
목록 조회 API 중 일부는 아래와 같은 페이징 필드를 반환합니다. (모듈에 따라 `list`/`data`/`users` 등 배열 필드명이 다를 수 있습니다.)
```json
{
  "success": true,
  "data": {
    "list": [ ... ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### 이미지 업로드 (Image Upload)
클래스·리뷰·프로필 이미지가 필요한 API는 **multipart/form-data**로 요청합니다.  
이미지 필드: 클래스 `images`(최대 3장), 리뷰 `images`(최대 3장), 프로필 `profileImage`(1장).  
허용 형식: jpg, jpeg, png, webp (파일당 최대 5MB).  
응답에 포함되는 이미지 URL은 서버 설정(로컬 또는 S3)에 따라 로컬 경로 또는 S3 공개 URL로 내려갑니다.

---

## 👤 회원 (User)

### [관리자] 회원 통계 조회
- **URL**: `GET /users/stats`
- **Header**: `Authorization` 필수 (ADMIN)
- **Response**: `200 OK`

### [관리자] 회원 목록 조회
- **URL**: `GET /users`
- **Header**: `Authorization` 필수 (ADMIN)
- **Query Params**:
  - `page`: 페이지 번호 (기본 1)
  - `limit`: 페이지당 개수 (기본 10)
  - `role`: `CUSTOMER` | `SELLER` | `ADMIN` (선택)
  - `searchType`: `nickname` | `email` | `phone` (선택)
  - `search`: 검색어 (선택, searchType과 함께 사용)
- **Response**: `200 OK` (Paging)

### [관리자 / 본인] 회원 상세 조회
관리자는 모든 회원, 일반 회원은 본인만 조회 가능합니다.

- **URL**: `GET /users/:id`
- **Header**: `Authorization` 필수
- **Response**: `200 OK`
- **Error Codes**:
  - `401`: 인증 필요
  - `403`: 타인 조회 시도 (본인 또는 ADMIN만 가능)
  - `USER_NOT_FOUND`: 회원 없음



### [관리자] 회원 메모 수정
회원 상세에 대한 관리자 전용 메모를 저장/수정합니다. 상세 조회 시 `note` 필드로 내려갑니다.

- **URL**: `PATCH /users/:id/note`
- **Header**: `Authorization` 필수 (ADMIN)
- **Body**:
  ```json
  { "note": "메모 내용" }
  ```
  - `note`: 문자열(최대 500자) 또는 `null`(메모 삭제)
- **Response**: `200 OK` — `{ "success": true, "data": { "note": "..." } }`
- **Error Codes**:
  - `MISSING_NOTE`: body에 note 미포함
  - `USER_NOT_FOUND`: 회원 없음

---

## 🏢 센터 (Center)

### [공통] 센터 목록 조회
- **URL**: `GET /centers`
- **Query Params**: `name`, `sort` (선택), `page` (기본 1), `limit` (기본 10)
- **Response**: `200 OK` (Paging)

### [공통] 센터 상세 조회
- **URL**: `GET /centers/:id`
- **Response**: `200 OK`

### [공통] 주소 → 위경도 (지오코딩)
카카오 주소 검색 API를 사용해 도로명주소를 위·경도로 변환합니다.
- **URL**: `GET /centers/geocode`
- **Query Params**: `address` (필수, 도로명주소)
- **Response**: `200 OK` — `{ "success": true, "data": { "lat": number, "lng": number } }`
- **Error Codes**:
  - `MISSING_ADDRESS`: address 쿼리 없음
  - `GEOCODE_UNAVAILABLE`: API 키 미설정
  - `GEOCODE_NOT_FOUND`: 해당 주소 좌표 없음

### [판매자] 내 센터 조회
- **URL**: `GET /centers/me`
- **Header**: `Authorization` 필수 (SELLER)
- **Response**: `200 OK`

### [판매자] 센터 수정
- **URL**: `PATCH /centers/:id`
- **Header**: `Authorization` 필수 (SELLER)
- **Body**: `name`, `address1`, `address2`, `introduction`, `businessHours`, `lat`, `lng` (선택)
- **Response**: `200 OK`

---

## 🏋️ 클래스 (Class)

### [공통] 클래스 목록 조회
- **URL**: `GET /classes`
- **Query Params**: `category`, `level`, `status`, `centerId`, `search`, `searchType`, `sort` (선택), `page` (기본 1), `limit` (기본 10)
- **Response**: `200 OK` (Paging)

### [공통] 클래스 상세 조회
- **URL**: `GET /classes/:id`
- **Response**: `200 OK`

### [관리자] 클래스 통계 조회
- **URL**: `GET /classes/stats`
- **Header**: `Authorization` 필수 (ADMIN)
- **Response**: `200 OK`

### [판매자] 클래스 생성 / 수정 / 삭제
- **URL**: `POST /classes`, `PATCH /classes/:id`, `DELETE /classes/:id`
- **Header**: `Authorization` 필수 (SELLER, 삭제는 ADMIN도 가능)
- **Body** (POST/PATCH): application/json 필드 + 이미지 시 **multipart/form-data**, 필드 `images` (최대 3장, 선택)
- **Response**: `201 Created` / `200 OK`

### [관리자] 클래스 승인 / 반려
- **URL**: `PATCH /classes/:id/approve`, `PATCH /classes/:id/reject`
- **Header**: `Authorization` 필수 (ADMIN)
- **Response**: `200 OK`

### [판매자] 슬롯 생성·수정·삭제
- **URL**: `POST /classes/:id/slots`, `PATCH /classes/:classId/slots/:slotId`, `DELETE /classes/:classId/slots/:slotId`
- **Header**: `Authorization` 필수 (SELLER)
- **Response**: `201 Created` / `200 OK`

### [판매자] 슬롯 일괄 생성
- **URL**: `POST /classes/:id/slots/generate`
- **Header**: `Authorization` 필수 (SELLER)
- **Body**: 스케줄 기반 생성 옵션 (검증 스키마 참고)
- **Response**: `201 Created` / `200 OK`

---

## 📅 예약 (Reservation)

### [고객] 예약 생성 (결제 포함)
슬롯을 선택하고 포인트를 차감하여 예약을 생성합니다. (쿠폰 적용 가능)

- **URL**: `POST /reservations`
- **Header**: `Authorization` 필수
- **Body**:
  ```json
  {
    "slotId": "uuid",
    "userCouponId": "uuid (선택)"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": { "id": "reservation_id", "status": "BOOKED", ... }
  }
  ```
- **Error Codes**:
  - `SLOT_NOT_FOUND`: 슬롯이 없음
  - `SLOT_CLOSED`: 예약 마감됨
  - `PAST_SLOT`: 지난 슬롯
  - `SLOT_FULL`: 정원 초과
  - `COUPON_NOT_FOUND`: 쿠폰이 없음 (userCouponId 사용 시)
  - `COUPON_USED`: 이미 사용된 쿠폰
  - `COUPON_EXPIRED`: 만료된 쿠폰
  - `INSUFFICIENT_POINTS`: 포인트 잔액 부족

### [고객] 내 예약 상세 조회
- **URL**: `GET /reservations/:id`
- **Header**: `Authorization` 필수
- **Response**: `200 OK`

### [고객] 내 예약 목록 조회
- **URL**: `GET /reservations`
- **Header**: `Authorization` 필수
- **Query Params**:
  - `page`: 페이지 번호 (기본 1)
  - `limit`: 페이지당 개수 (기본 10)
  - `status`: `BOOKED` | `CANCELED` | `COMPLETED` (선택)
- **Response**: `200 OK` (Paging)

### [고객] 예약 취소 (환불)
- **URL**: `PATCH /reservations/:id/cancel`
- **Header**: `Authorization` 필수
- **Body**:
  ```json
  {
    "cancelNote": "단순 변심" // (선택)
  }
  ```
- **Response**: `200 OK`

### [판매자] 주간 내 클래스 슬롯 조회
- **URL**: `GET /reservations/seller/slots`
- **Header**: `Authorization` 필수 (SELLER)
- **Query Params**: `startDate` (필수), `endDate` (필수), `classId` (선택)
- **Response**: `200 OK`

### [판매자] 내 슬롯 예약 목록 조회
- **URL**: `GET /reservations/seller/reservations`
- **Header**: `Authorization` 필수 (SELLER)
- **Query Params**: `page`, `limit`, `userId`, `classId`, `slotId`, `status`, `startDate`, `endDate`, `keyword`, `searchType` (선택)
- **Response**: `200 OK` (Paging)

### [판매자] 예약 상세 조회 (결제정보·타임라인)
- **URL**: `GET /reservations/seller/reservations/:id`
- **Header**: `Authorization` 필수 (SELLER)
- **Response**: `200 OK`

### [판매자] 특정 유저 예약 취소
- **URL**: `PATCH /reservations/seller/reservations/:id/cancel`
- **Header**: `Authorization` 필수 (SELLER)
- **Body**: `{ "cancelNote": "..." }` (선택)
- **Response**: `200 OK`

### [판매자] 예약 완료 처리
- **URL**: `PATCH /reservations/:id/complete`
- **Header**: `Authorization` 필수 (SELLER)
- **Response**: `200 OK`

### [관리자] 전체 예약 조회
- **URL**: `GET /reservations/admin/reservations`
- **Header**: `Authorization` 필수 (ADMIN)
- **Query Params**: `page`, `limit`, `userId`, `classId`, `slotId`, `status`, `startDate`, `endDate`, `keyword`, `searchType` (선택)
- **Response**: `200 OK` (Paging)

### [관리자] 특정 예약 취소
- **URL**: `DELETE /reservations/admin/reservations/:id`
- **Header**: `Authorization` 필수 (ADMIN)
- **Body**: `{ "cancelNote": "..." }` (선택)
- **Response**: `200 OK`

### [관리자] 예약 통계 (최근 한달 등)
- **URL**: `GET /reservations/admin/reservations/stats`
- **Header**: `Authorization` 필수 (ADMIN)
- **Query Params**: `startDate`, `endDate` (선택)
- **Response**: `200 OK`

---

## ⭐ 리뷰 (Review)

### [고객] 리뷰 작성
수강 완료(COMPLETED)된 클래스에 대해 리뷰를 작성합니다. 이미지는 **multipart/form-data**의 `images`(최대 3장)로 보내거나, JSON body의 `imgUrls`로 URL 배열 전달 가능합니다.

- **URL**: `POST /reviews`
- **Header**: `Authorization` 필수
- **Body** (application/json 또는 multipart/form-data):
  - `reservationId`: uuid (필수)
  - `rating`: 1~5 정수 (필수)
  - `content`: 문자열 (선택)
  - `imgUrls`: URL 배열 (선택, JSON 시)
  - `images`: 이미지 파일 최대 3장 (선택, multipart 시)
- **Response**: `201 Created`
- **Error Codes**:
  - `DUPLICATE_REVIEW`: 이미 리뷰를 작성함
  - `INVALID_STATUS`: 완료된 예약이 아님

### [공통] 센터별 리뷰 조회
- **URL**: `GET /reviews/center/:centerId`
- **Query Params**: `page` (기본 1), `limit` (기본 20)
- **Response**: `200 OK` — `data: { reviews, pagination: { totalCount, totalPage, currentPage, limit } }`

### [공통] 클래스별 리뷰 조회
- **URL**: `GET /reviews/class/:classId`
- **Query Params**: `page` (기본 1), `limit` (기본 20)
- **Response**: `200 OK` — `data: { reviews, pagination: { totalCount, totalPage, currentPage, limit } }`

### [고객] 내 예약별 리뷰 조회
- **URL**: `GET /reviews/my/:reservationId`
- **Header**: `Authorization` 필수
- **Response**: `200 OK` (해당 예약에 대한 본인 리뷰 또는 null)

### [고객] 리뷰 수정
- **URL**: `PATCH /reviews/:reviewId`
- **Header**: `Authorization` 필수
- **Body**: `rating`, `content`, `imgUrls`(JSON) 또는 multipart로 `images`(최대 3장) 중 수정할 필드만 (모두 선택)
- **Response**: `200 OK`

### [고객] 리뷰 삭제
- **URL**: `DELETE /reviews/:reviewId`
- **Header**: `Authorization` 필수
- **Response**: `200 OK`

---

## 💰 포인트 (Point)

### [고객] 포인트 충전
PG사 결제 완료 후 호출하여 충전 처리합니다.

- **URL**: `POST /points/charge`
- **Header**: `Authorization` 필수
- **Body**:
  ```json
  {
    "amount": 10000,
    "paymentKey": "toss_payment_key", 
    "orderId": "order_id"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": { "pointHistory": { ... }, "balanceAfter": 15000 }
  }
  ```

### [고객] 내 포인트 잔액 조회
- **URL**: `GET /points/me`
- **Header**: `Authorization` 필수
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "pointBalance": 5000 } }
  ```

### [고객] 내 포인트 내역 조회
- **URL**: `GET /points/me/history`
- **Header**: `Authorization` 필수
- **Query Params**: `page` (기본 1), `limit` (기본 10), `type` (선택: `CHARGE` | `USE` | `REFUND` | `ADMIN`)
- **Response**: `200 OK` (Paging)

### [판매자] 매출 정산 요약·클래스별 매출 조회
- **URL**: `GET /points/seller/settlement`
- **Header**: `Authorization` 필수 (SELLER)
- **Query Params**: `year` (필수), `month` (필수)
- **Response**: `200 OK`

### [판매자] 거래 내역 조회
- **URL**: `GET /points/seller/transactions`
- **Header**: `Authorization` 필수 (SELLER)
- **Query Params**: `year` (필수), `month` (필수), `classId` (선택), `page` (기본 1), `limit` (기본 20)
- **Response**: `200 OK` (Paging)

### [관리자] 포인트 지급/회수
- **URL**: `POST /points/admin/adjust`
- **Header**: `Authorization` 필수 (ADMIN)
- **Body**:
  ```json
  {
    "userId": "user_cuid",
    "amount": 1000,
    "memo": "이벤트 보너스"
  }
  ```
  - `amount`: 양수(지급), 음수(회수), 0 불가
- **Response**: `200 OK`

### [관리자] 전체 포인트 내역 조회
- **URL**: `GET /points/admin/history`
- **Header**: `Authorization` 필수 (ADMIN)
- **Query Params**: `page` (기본 1), `limit` (기본 10), `type` (선택), `userId` (선택)
- **Response**: `200 OK` (Paging)

---

## 🎫 쿠폰 (Coupon)

모든 API는 `Authorization` 헤더 필수입니다.

### [판매자/관리자] 쿠폰 템플릿 생성
- **URL**: `POST /coupons`
- **Header**: `Authorization` 필수 (SELLER 또는 ADMIN)
- **Body**:
  ```json
  {
    "name": "신규 가입 1000P 할인",
    "discountType": "AMOUNT",
    "usageValue": 1000,
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }
  ```
  - `name`: 쿠폰 이름 (필수)
  - `discountType`: `AMOUNT`(금액 할인) | `PERCENTAGE`(비율 할인)
  - `usageValue`: 할인 값 (정수, 금액 또는 퍼센트)
  - `expiresAt`: 만료일 (ISO 8601)
- **Response**: `201 Created`

### [판매자/관리자] 내가 만든 쿠폰 목록 조회
- **URL**: `GET /coupons`
- **Header**: `Authorization` 필수
- **Response**: `200 OK` (내가 발급한 쿠폰 템플릿 목록)

### [판매자/관리자] 쿠폰 지급
특정 유저에게 쿠폰을 발급합니다.
- **URL**: `POST /coupons/give`
- **Header**: `Authorization` 필수 (SELLER 또는 ADMIN)
- **Body**:
  ```json
  {
    "userId": "user_cuid",
    "templateId": "template_cuid"
  }
  ```
- **Response**: `201 Created`

### [본인/관리자] 특정 유저 쿠폰함 조회
본인은 자신의 쿠폰함, 관리자는 모든 유저 쿠폰함 조회 가능.
- **URL**: `GET /coupons/user/:userId`
- **Header**: `Authorization` 필수
- **Response**: `200 OK` (해당 유저의 보유 쿠폰 목록)
- **Error Codes**:
  - `403`: 본인 또는 ADMIN이 아닌 경우

### [판매자/관리자] 쿠폰 템플릿 수정
- **URL**: `PUT /coupons/:id`
- **Header**: `Authorization` 필수 (SELLER 또는 ADMIN)
- **Body** (모든 필드 선택):
  ```json
  {
    "name": "수정된 쿠폰명",
    "discountType": "PERCENTAGE",
    "usageValue": 10,
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }
  ```
- **Response**: `200 OK`

### [판매자/관리자] 쿠폰 템플릿 삭제
- **URL**: `DELETE /coupons/:id`
- **Header**: `Authorization` 필수 (SELLER 또는 ADMIN)
- **Response**: `200 OK` — `{ "success": true, "message": "쿠폰이 삭제되었습니다." }`

---

## 🔔 알림 (Notification)

모든 API는 `Authorization` 헤더 필수입니다.

### [관리자] 알림 생성
- **URL**: `POST /notifications`
- **Header**: `Authorization` 필수 (ADMIN)
- **Body**:
  ```json
  {
    "userId": "user_cuid",
    "title": "알림 제목",
    "body": "알림 본문 (선택)",
    "linkUrl": "/path 또는 https://..."
  }
  ```
- **Response**: `201 Created`

### [공통] 실시간 알림 스트림 (SSE)
- **URL**: `GET /notifications/stream`
- **Header**: `Authorization` 필수
- **Response**: `200 OK` — `Content-Type: text/event-stream` (SSE 연결 유지)

### [공통] 내 알림 목록 조회
- **URL**: `GET /notifications`
- **Header**: `Authorization` 필수
- **Query Params**: `page` (기본 1), `limit` (기본 20), `userId` (선택, 관리자용)
- **Response**: `200 OK` (미읽음 알림 30일 이내 등)

### [공통] 알림 단건 조회
- **URL**: `GET /notifications/:id`
- **Header**: `Authorization` 필수
- **Response**: `200 OK`

### [공통] 알림 읽음 처리
- **URL**: `PATCH /notifications/:id`
- **Header**: `Authorization` 필수 (본인 또는 ADMIN)
- **Body**: `{ "isRead": true }`
- **Response**: `200 OK`

### [공통] 알림 삭제
- **URL**: `DELETE /notifications/:id`
- **Header**: `Authorization` 필수 (본인 또는 ADMIN)
- **Response**: `200 OK`

---

## 🔑 인증 (Auth)

### 회원가입
- **URL**: `POST /auth/signup`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "nickname": "헬린이",
    "phone": "01012345678",
    "role": "CUSTOMER"
  }
  ```
  - `role`: `CUSTOMER` | `SELLER` (선택, 기본값 `CUSTOMER`). ADMIN은 가입 불가.
  - `SELLER` 가입 시에는 반드시 아래와 같은 `center` 객체가 포함되어야 합니다.
  ```json
  {
    "role": "SELLER",
    "center": {
      "name": "짐 체육관",
      "address1": "서울시 강남구 테헤란로",
      "address2": "1층"
    }
  }
  ```

### 로그인
- **URL**: `POST /auth/login`
- **Body**: `{ "email": "...", "password": "..." }`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "user": { ... }
    }
  }
  ```

### 토큰 갱신 (Silent Refresh)
Access Token 만료 시 호출합니다. (쿠키 기반)
- **URL**: `POST /auth/refresh`
- **Response**: `200 OK` (새로운 토큰 발급)

### 로그아웃
- **URL**: `POST /auth/logout`
- **Response**: `200 OK` (쿠키 제거)

### [로그인 유저] 내 정보 조회
- **URL**: `GET /auth/me`
- **Header**: `Authorization` 필수
- **Response**: `200 OK` (현재 로그인 유저 정보)

### [고객] 내 정보 수정
- **URL**: `PUT /auth/customer/me`
- **Header**: `Authorization` 필수 (CUSTOMER)
- **Body** (multipart/form-data 또는 application/json):
  - `nickname`: 닉네임 (선택)
  - `phone`: 연락처 (선택)
  - `introduction`: 자기소개 (선택)
  - `password`: 새 비밀번호 (선택)
  - `passwordConfirm`: 비밀번호 확인 (password 입력 시 필수)
  - `profileImage`: 프로필 이미지 파일 (선택, multipart 시)
- **Response**: `200 OK`

### [판매자] 내 정보 수정 (센터 정보 포함)
- **URL**: `PUT /auth/seller/me`
- **Header**: `Authorization` 필수 (SELLER)
- **Body** (multipart/form-data 또는 application/json):
  - `nickname`: 닉네임 (선택)
  - `phone`: 연락처 (선택)
  - `password`: 새 비밀번호 (선택)
  - `passwordConfirm`: 비밀번호 확인 (password 입력 시 필수)
  - `centerName`: 업체명 (선택)
  - `address1`: 도로명주소 (선택)
  - `address2`: 상세주소 (선택)
  - `introduction`: 업체소개 (선택)
  - `profileImage`: 프로필 이미지 파일 (선택, multipart 시)
- **Response**: `200 OK`
