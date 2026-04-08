-- AlterTable: add per-branch ELO rating columns to user_stats
ALTER TABLE "user_stats" ADD COLUMN "logicRating" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "user_stats" ADD COLUMN "eruditionRating" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "user_stats" ADD COLUMN "strategyRating" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "user_stats" ADD COLUMN "rhetoricRating" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "user_stats" ADD COLUMN "intuitionRating" INTEGER NOT NULL DEFAULT 1000;
