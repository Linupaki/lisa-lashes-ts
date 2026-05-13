/*
  Warnings:

  - You are about to drop the column `is_admin` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_admin",
ADD COLUMN     "role" "user_roles" NOT NULL DEFAULT 'user';
