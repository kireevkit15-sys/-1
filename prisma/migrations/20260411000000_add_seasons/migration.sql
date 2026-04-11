-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_rewards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seasonId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "totalXp" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seasons_isActive_idx" ON "seasons"("isActive");

-- CreateIndex
CREATE INDEX "seasons_endDate_idx" ON "seasons"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "season_rewards_seasonId_userId_key" ON "season_rewards"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "season_rewards_seasonId_rank_idx" ON "season_rewards"("seasonId", "rank");

-- AddForeignKey
ALTER TABLE "season_rewards" ADD CONSTRAINT "season_rewards_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rewards" ADD CONSTRAINT "season_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
