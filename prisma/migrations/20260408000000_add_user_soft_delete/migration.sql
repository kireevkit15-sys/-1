-- AlterTable
ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Index for filtering active users
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");
