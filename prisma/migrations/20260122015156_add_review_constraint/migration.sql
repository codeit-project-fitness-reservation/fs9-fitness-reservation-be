-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('BOOKED', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PointUsed" AS ENUM ('CHARGE', 'USE', 'REFUND', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "profile_img_url" TEXT,
    "introduction" TEXT,
    "point_balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centers" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "introduction" TEXT,
    "business_hours" JSONB,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT,
    "notice" TEXT,
    "price_points" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "banner_url" TEXT,
    "img_urls" TEXT[],
    "status" "ClassStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_slots" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "current_reservation" INTEGER NOT NULL DEFAULT 0,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'BOOKED',
    "slot_start_at" TIMESTAMP(3) NOT NULL,
    "price_points" INTEGER NOT NULL,
    "coupon_discount_points" INTEGER NOT NULL DEFAULT 0,
    "paid_points" INTEGER NOT NULL DEFAULT 0,
    "user_coupon_id" TEXT,
    "canceled_at" TIMESTAMP(3),
    "canceled_by" "UserRole",
    "cancel_note" TEXT,
    "admin_memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "PointUsed" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reservation_id" TEXT,
    "order_id" TEXT,
    "payment_key" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_templates" (
    "id" TEXT NOT NULL,
    "center_id" TEXT,
    "name" TEXT NOT NULL,
    "discount_points" INTEGER,
    "discount_percentage" INTEGER,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_coupons" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "img_urls" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "centers_owner_id_key" ON "centers"("owner_id");

-- CreateIndex
CREATE INDEX "classes_center_id_idx" ON "classes"("center_id");

-- CreateIndex
CREATE INDEX "classes_status_idx" ON "classes"("status");

-- CreateIndex
CREATE INDEX "class_slots_start_at_idx" ON "class_slots"("start_at");

-- CreateIndex
CREATE UNIQUE INDEX "class_slots_class_id_start_at_key" ON "class_slots"("class_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_user_coupon_id_key" ON "reservations"("user_coupon_id");

-- CreateIndex
CREATE INDEX "reservations_user_id_created_at_idx" ON "reservations"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "reservations_class_id_created_at_idx" ON "reservations"("class_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_slot_id_user_id_key" ON "reservations"("slot_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_user_id_slot_start_at_key" ON "reservations"("user_id", "slot_start_at");

-- CreateIndex
CREATE UNIQUE INDEX "point_history_payment_key_key" ON "point_history"("payment_key");

-- CreateIndex
CREATE INDEX "point_history_user_id_created_at_idx" ON "point_history"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "point_history_type_created_at_idx" ON "point_history"("type", "created_at");

-- CreateIndex
CREATE INDEX "coupon_templates_center_id_idx" ON "coupon_templates"("center_id");

-- CreateIndex
CREATE INDEX "user_coupons_user_id_used_at_idx" ON "user_coupons"("user_id", "used_at");

-- CreateIndex
CREATE INDEX "user_coupons_template_id_idx" ON "user_coupons"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reservation_id_key" ON "reviews"("reservation_id");

-- CreateIndex
CREATE INDEX "reviews_class_id_created_at_idx" ON "reviews"("class_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "centers" ADD CONSTRAINT "centers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_slots" ADD CONSTRAINT "class_slots_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "class_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_coupon_id_fkey" FOREIGN KEY ("user_coupon_id") REFERENCES "user_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_history" ADD CONSTRAINT "point_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_history" ADD CONSTRAINT "point_history_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_templates" ADD CONSTRAINT "coupon_templates_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "coupon_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 리뷰 작성 가능한지 확인
CREATE OR REPLACE FUNCTION check_review_eligibility()
RETURNS TRIGGER AS $$
BEGIN
    -- reservations 테이블에서 해당 예약의 상태가 'COMPLETED'인지 확인
    -- 만약 COMPLETED가 아니면 에러를 발생시켜 INSERT를 중단함
    IF NOT EXISTS (
        SELECT 1 FROM reservations 
        WHERE id = NEW.reservation_id 
        AND status = 'COMPLETED'
    ) THEN
        RAISE EXCEPTION '수강 완료(COMPLETED)된 예약에 대해서만 리뷰를 작성할 수 있습니다.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. reviews 테이블에 새로운 리뷰가 INSERT 되기 전에 위 함수를 실행
CREATE TRIGGER enforce_review_eligibility
BEFORE INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION check_review_eligibility();