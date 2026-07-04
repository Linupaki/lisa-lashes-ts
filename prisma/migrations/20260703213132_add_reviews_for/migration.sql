/*
  Warnings:

  - A unique constraint covering the columns `[service_id,user_id]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "in_slider" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "service_id" INTEGER,
ADD COLUMN     "slider_image_path" TEXT,
ALTER COLUMN "product_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_service_id_user_id_key" ON "reviews"("service_id", "user_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "salon_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
