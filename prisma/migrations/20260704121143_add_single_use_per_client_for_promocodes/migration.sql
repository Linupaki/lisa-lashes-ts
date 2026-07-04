/*
  Warnings:

  - You are about to drop the column `service_id` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `slider_image_path` on the `reviews` table. All the data in the column will be lost.
  - Made the column `product_id` on table `reviews` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_service_id_fkey";

-- DropIndex
DROP INDEX "reviews_service_id_user_id_key";

-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN     "single_use_per_user" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "service_id",
DROP COLUMN "slider_image_path",
ALTER COLUMN "product_id" SET NOT NULL;
