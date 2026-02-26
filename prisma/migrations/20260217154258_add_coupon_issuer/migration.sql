/*
  Warnings:

  - Added the required column `issuer_id` to the `coupon_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "coupon_templates" ADD COLUMN     "issuer_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "coupon_templates_issuer_id_idx" ON "coupon_templates"("issuer_id");

-- AddForeignKey
ALTER TABLE "coupon_templates" ADD CONSTRAINT "coupon_templates_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
