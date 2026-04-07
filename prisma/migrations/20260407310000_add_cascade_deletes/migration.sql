-- DropForeignKey and re-add with cascade for UserStats
ALTER TABLE "user_stats" DROP CONSTRAINT IF EXISTS "user_stats_userId_fkey";
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Battle player1 cascade
ALTER TABLE "battles" DROP CONSTRAINT IF EXISTS "battles_player1Id_fkey";
ALTER TABLE "battles" ADD CONSTRAINT "battles_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Battle player2 set null
ALTER TABLE "battles" DROP CONSTRAINT IF EXISTS "battles_player2Id_fkey";
ALTER TABLE "battles" ADD CONSTRAINT "battles_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Battle winner set null
ALTER TABLE "battles" DROP CONSTRAINT IF EXISTS "battles_winnerId_fkey";
ALTER TABLE "battles" ADD CONSTRAINT "battles_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BattleRound attacker cascade
ALTER TABLE "battle_rounds" DROP CONSTRAINT IF EXISTS "battle_rounds_attackerId_fkey";
ALTER TABLE "battle_rounds" ADD CONSTRAINT "battle_rounds_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
