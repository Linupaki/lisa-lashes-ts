/*
  Warnings:

  - You are about to drop the column `duration` on the `salon_services` table. All the data in the column will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "user_id" INTEGER;

-- AlterTable
ALTER TABLE "salon_services" DROP COLUMN "duration",
ADD COLUMN     "duration_minutes" INTEGER NOT NULL DEFAULT 60;

-- DropTable
DROP TABLE "sessions";

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
