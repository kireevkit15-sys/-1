-- CreateEnum
CREATE TYPE "LevelName" AS ENUM ('SLEEPING', 'AWAKENED', 'OBSERVER', 'WARRIOR', 'STRATEGIST', 'MASTER');

-- CreateEnum
CREATE TYPE "BarrierStage" AS ENUM ('RECALL', 'CONNECT', 'APPLY', 'DEFEND', 'VERDICT');

-- CreateEnum
CREATE TYPE "ConceptRelationType" AS ENUM ('PREREQUISITE', 'RELATED', 'CONTRASTS', 'DEEPENS', 'APPLIES_IN');

-- CreateEnum
CREATE TYPE "DepthLayerType" AS ENUM ('ALTERNATIVE', 'SCIENCE', 'BOOK', 'PHILOSOPHY', 'CONTRADICTION', 'CONNECTIONS');

-- CreateTable
CREATE TABLE "concepts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "branch" "Branch" NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "bloomLevel" SMALLINT NOT NULL DEFAULT 1,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BRONZE',
    "sourceFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_relations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourceId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "relationType" "ConceptRelationType" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "concept_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_concept_mastery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "conceptId" UUID NOT NULL,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "bloomReached" SMALLINT NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,
    "lastTestedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_concept_mastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "currentLevel" "LevelName" NOT NULL DEFAULT 'SLEEPING',
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "startZone" TEXT,
    "painPoint" TEXT,
    "deliveryStyle" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pathId" UUID NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "conceptId" UUID NOT NULL,
    "cards" JSONB NOT NULL,
    "metrics" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_barriers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pathId" UUID NOT NULL,
    "level" "LevelName" NOT NULL,
    "stages" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_barriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depth_layers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conceptId" UUID NOT NULL,
    "layerType" "DepthLayerType" NOT NULL,
    "content" JSONB NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depth_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conceptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,

    CONSTRAINT "concept_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "concepts_slug_key" ON "concepts"("slug");
CREATE INDEX "concepts_branch_idx" ON "concepts"("branch");
CREATE INDEX "concepts_category_idx" ON "concepts"("category");
CREATE INDEX "concepts_branch_category_idx" ON "concepts"("branch", "category");
CREATE INDEX "concepts_difficulty_idx" ON "concepts"("difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "concept_relations_sourceId_targetId_relationType_key" ON "concept_relations"("sourceId", "targetId", "relationType");
CREATE INDEX "concept_relations_sourceId_idx" ON "concept_relations"("sourceId");
CREATE INDEX "concept_relations_targetId_idx" ON "concept_relations"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "user_concept_mastery_userId_conceptId_key" ON "user_concept_mastery"("userId", "conceptId");
CREATE INDEX "user_concept_mastery_userId_idx" ON "user_concept_mastery"("userId");
CREATE INDEX "user_concept_mastery_conceptId_idx" ON "user_concept_mastery"("conceptId");
CREATE INDEX "user_concept_mastery_userId_mastery_idx" ON "user_concept_mastery"("userId", "mastery");
CREATE INDEX "user_concept_mastery_nextReviewAt_idx" ON "user_concept_mastery"("nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_userId_key" ON "learning_paths"("userId");
CREATE INDEX "learning_paths_currentLevel_idx" ON "learning_paths"("currentLevel");

-- CreateIndex
CREATE UNIQUE INDEX "learning_days_pathId_dayNumber_key" ON "learning_days"("pathId", "dayNumber");
CREATE INDEX "learning_days_pathId_idx" ON "learning_days"("pathId");
CREATE INDEX "learning_days_conceptId_idx" ON "learning_days"("conceptId");

-- CreateIndex
CREATE INDEX "level_barriers_pathId_idx" ON "level_barriers"("pathId");
CREATE INDEX "level_barriers_pathId_level_idx" ON "level_barriers"("pathId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "depth_layers_conceptId_layerType_key" ON "depth_layers"("conceptId", "layerType");
CREATE INDEX "depth_layers_conceptId_idx" ON "depth_layers"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "concept_questions_conceptId_questionId_key" ON "concept_questions"("conceptId", "questionId");
CREATE INDEX "concept_questions_conceptId_idx" ON "concept_questions"("conceptId");
CREATE INDEX "concept_questions_questionId_idx" ON "concept_questions"("questionId");

-- AddForeignKey
ALTER TABLE "concept_relations" ADD CONSTRAINT "concept_relations_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_relations" ADD CONSTRAINT "concept_relations_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_concept_mastery" ADD CONSTRAINT "user_concept_mastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_days" ADD CONSTRAINT "learning_days_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_days" ADD CONSTRAINT "learning_days_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_barriers" ADD CONSTRAINT "level_barriers_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depth_layers" ADD CONSTRAINT "depth_layers_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_questions" ADD CONSTRAINT "concept_questions_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concept_questions" ADD CONSTRAINT "concept_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
