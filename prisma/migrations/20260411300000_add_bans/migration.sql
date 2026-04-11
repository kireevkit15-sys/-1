-- CreateEnum
CREATE TYPE "BanType" AS ENUM ('TEMPORARY', 'PERMANENT');
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "user_bans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "type" "BanType" NOT NULL DEFAULT 'TEMPORARY',
    "expiresAt" TIMESTAMP(3),
    "appealText" TEXT,
    "appealedAt" TIMESTAMP(3),
    "appealStatus" "AppealStatus",
    "issuedBy" UUID,
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_bans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_bans_userId_idx" ON "user_bans"("userId");
CREATE INDEX "user_bans_expiresAt_idx" ON "user_bans"("expiresAt");

-- AddForeignKey
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
