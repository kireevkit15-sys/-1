-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('LIKE', 'DISLIKE', 'REPORT');

-- CreateEnum
CREATE TYPE "FeedCardType" AS ENUM ('INSIGHT', 'CHALLENGE', 'CASE', 'SPARRING', 'FORGE', 'WISDOM', 'ARENA');

-- CreateEnum
CREATE TYPE "WarriorRank" AS ENUM ('NOVICE', 'WARRIOR', 'GLADIATOR', 'STRATEGIST', 'SPARTAN');

-- DropIndex
DROP INDEX IF EXISTS "questions_variantOf_idx";

-- DropIndex
DROP INDEX IF EXISTS "users_deletedAt_idx";

-- AlterTable
ALTER TABLE "achievements" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ai_token_usage" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "analytics_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "daily_challenges" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "daily_challenges" ALTER COLUMN "difficulty" TYPE "Difficulty" USING "difficulty"::"Difficulty";
ALTER TABLE "daily_challenges" ALTER COLUMN "branch" TYPE "Branch" USING "branch"::"Branch";

-- AlterTable
ALTER TABLE "daily_facts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "daily_facts" ALTER COLUMN "branch" TYPE "Branch" USING "branch"::"Branch";

-- AlterTable
ALTER TABLE "push_subscriptions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "referrals" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "season_rewards" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "seasons" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tournament_participants" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tournaments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_bans" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "referralCode" DROP DEFAULT;

-- AlterTable
ALTER TABLE "warmup_results" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webhook_deliveries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webhook_endpoints" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "question_feedbacks" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "branch" "Branch" NOT NULL,
    "rank" "WarriorRank" NOT NULL DEFAULT 'NOVICE',
    "durationDays" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "prerequisiteCampaignIds" UUID[] DEFAULT ARRAY[]::UUID[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_cards" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "dayNumber" SMALLINT NOT NULL,
    "orderInDay" SMALLINT NOT NULL,
    "type" "FeedCardType" NOT NULL,
    "content" JSONB NOT NULL,
    "branch" "Branch" NOT NULL,
    "questionId" UUID,
    "statPrimary" TEXT,

    CONSTRAINT "campaign_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_campaign_progress" (
    "userId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "completedCardIds" UUID[] DEFAULT ARRAY[]::UUID[],
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "user_campaign_progress_pkey" PRIMARY KEY ("userId","campaignId")
);

-- CreateTable
CREATE TABLE "user_feed_state" (
    "userId" UUID NOT NULL,
    "activeCampaignIds" UUID[] DEFAULT ARRAY[]::UUID[],
    "todayCards" JSONB NOT NULL DEFAULT '[]',
    "forgeQueue" JSONB NOT NULL DEFAULT '[]',
    "feedStreak" INTEGER NOT NULL DEFAULT 0,
    "lastFeedDate" TEXT,
    "todayViewedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_feed_state_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "feed_card_interactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "campaignId" UUID,
    "type" TEXT NOT NULL,
    "answerIndex" SMALLINT,
    "timeTakenMs" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_card_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_feedbacks_questionId_idx" ON "question_feedbacks"("questionId");

-- CreateIndex
CREATE INDEX "question_feedbacks_userId_idx" ON "question_feedbacks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "question_feedbacks_questionId_userId_type_key" ON "question_feedbacks"("questionId", "userId", "type");

-- CreateIndex
CREATE INDEX "campaigns_branch_idx" ON "campaigns"("branch");

-- CreateIndex
CREATE INDEX "campaigns_rank_idx" ON "campaigns"("rank");

-- CreateIndex
CREATE INDEX "campaigns_isActive_idx" ON "campaigns"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_branch_orderIndex_key" ON "campaigns"("branch", "orderIndex");

-- CreateIndex
CREATE INDEX "campaign_cards_campaignId_dayNumber_idx" ON "campaign_cards"("campaignId", "dayNumber");

-- CreateIndex
CREATE INDEX "campaign_cards_type_idx" ON "campaign_cards"("type");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_cards_campaignId_dayNumber_orderInDay_key" ON "campaign_cards"("campaignId", "dayNumber", "orderInDay");

-- CreateIndex
CREATE INDEX "user_campaign_progress_userId_idx" ON "user_campaign_progress"("userId");

-- CreateIndex
CREATE INDEX "feed_card_interactions_userId_createdAt_idx" ON "feed_card_interactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "feed_card_interactions_cardId_idx" ON "feed_card_interactions"("cardId");

-- CreateIndex
CREATE INDEX "feed_card_interactions_campaignId_idx" ON "feed_card_interactions"("campaignId");

-- CreateIndex
CREATE INDEX "battle_rounds_branch_idx" ON "battle_rounds"("branch");

-- CreateIndex
DROP INDEX IF EXISTS "daily_facts_branch_idx";
CREATE INDEX "daily_facts_branch_idx" ON "daily_facts"("branch");

-- AddForeignKey
ALTER TABLE "question_feedbacks" ADD CONSTRAINT "question_feedbacks_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_feedbacks" ADD CONSTRAINT "question_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_cards" ADD CONSTRAINT "campaign_cards_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campaign_progress" ADD CONSTRAINT "user_campaign_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campaign_progress" ADD CONSTRAINT "user_campaign_progress_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feed_state" ADD CONSTRAINT "user_feed_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_card_interactions" ADD CONSTRAINT "feed_card_interactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "campaign_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

