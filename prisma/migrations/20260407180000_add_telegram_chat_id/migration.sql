-- AlterTable
ALTER TABLE "users" ADD COLUMN "telegramChatId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramChatId_key" ON "users"("telegramChatId");
