-- CreateEnum
CREATE TYPE "data_completeness" AS ENUM ('BASIC_PRESS_KIT', 'FULL_PRESS_KIT', 'MAIN_CAST', 'MAIN_CREW', 'FULL_CAST', 'FULL_CREW');

-- AlterTable
ALTER TABLE "movies" ADD COLUMN "data_completeness" "data_completeness" NOT NULL DEFAULT 'BASIC_PRESS_KIT';