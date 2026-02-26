-- DropForeignKey
ALTER TABLE "class_slots" DROP CONSTRAINT "class_slots_class_id_fkey";

-- AddForeignKey
ALTER TABLE "class_slots" ADD CONSTRAINT "class_slots_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
