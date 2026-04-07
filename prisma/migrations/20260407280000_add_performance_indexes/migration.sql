-- Performance indexes for DB optimization (Week 12)

-- BattleRound: index on battleId for loading rounds by battle
CREATE INDEX IF NOT EXISTS "battle_rounds_battleId_idx" ON "battle_rounds"("battleId");

-- BattleRound: index on attackerId
CREATE INDEX IF NOT EXISTS "battle_rounds_attackerId_idx" ON "battle_rounds"("attackerId");

-- AiDialogue: index on userId for user's dialogue list
CREATE INDEX IF NOT EXISTS "ai_dialogues_userId_idx" ON "ai_dialogues"("userId");

-- UserStats: index on streakDays for streak leaderboard
CREATE INDEX IF NOT EXISTS "user_stats_streakDays_idx" ON "user_stats"("streakDays" DESC);

-- Battle: index on endedAt for history sorting
CREATE INDEX IF NOT EXISTS "battles_endedAt_idx" ON "battles"("endedAt");

-- Battle: index on winnerId for win count queries
CREATE INDEX IF NOT EXISTS "battles_winnerId_idx" ON "battles"("winnerId");

-- Question: composite index for getRandomForBattle (branch + difficulty + category + isActive)
CREATE INDEX IF NOT EXISTS "questions_branch_difficulty_category_isActive_idx"
  ON "questions"("branch", "difficulty", "category", "isActive");

-- Expression index on total XP for leaderboard XP sorting/ranking
CREATE INDEX IF NOT EXISTS "user_stats_total_xp_idx"
  ON "user_stats" (("logicXp" + "eruditionXp" + "strategyXp" + "rhetoricXp" + "intuitionXp") DESC);
