-- AlterTable: add branch column to battle_rounds
ALTER TABLE "battle_rounds" ADD COLUMN IF NOT EXISTS "branch" "Branch";
