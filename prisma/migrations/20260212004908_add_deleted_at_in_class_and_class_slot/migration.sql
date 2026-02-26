-- AlterTable
ALTER TABLE "class_slots" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "deleted_at" TIMESTAMP(3);
