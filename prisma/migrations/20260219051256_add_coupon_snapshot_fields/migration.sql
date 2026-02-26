/*
  Warnings:

  - Added the required column `coupon_name` to the `user_coupons` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_coupons" DROP CONSTRAINT "user_coupons_template_id_fkey";

-- AlterTable
ALTER TABLE "user_coupons" ADD COLUMN     "coupon_name" TEXT NOT NULL,
ADD COLUMN     "discount_percentage" INTEGER,
ADD COLUMN     "discount_points" INTEGER,
ALTER COLUMN "template_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "coupon_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
