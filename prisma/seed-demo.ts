// ─────────────────────────────────────────────
//  РАЗУМ — Demo Seed (для презентации инвесторам)
// ─────────────────────────────────────────────
//
//  Запуск: npx tsx prisma/seed-demo.ts
//  Или:    pnpm db:seed-demo
//
//  Создаёт:
//    - 5 demo-пользователей с реалистичными статами
//    - 1 аккаунт «Инвестор» для live-демо
//    - 10 завершённых батлов с разнообразными результатами
//    - Скрипт идемпотентный — безопасно запускать повторно
//
//  ВАЖНО: перед первым запуском выполните pnpm install в prisma/
// ─────────────────────────────────────────────

import { PrismaClient, BattleStatus, BattleMode } from "@prisma/client";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

// ── Demo Users ──────────────────────────────────────────────

interface DemoUser {
  name: string;
  email: string;
  password: string;
  level: number;
  rating: number;
  streak: number;
  stats: {
    logicXp: number;
    eruditionXp: number;
    strategyXp: number;
    rhetoricXp: number;
    intuitionXp: number;
  };
}

// XP формула: ~level * 500 + вариация, распределено по статам
// Высокоуровневые пользователи имеют больше XP, распределённого неравномерно
// Это создаёт реалистичную картину: каждый пользователь силён в своих областях

const demoUsers: DemoUser[] = [
  {
    name: "Александр",
    email: "alex@demo.razum.app",
    password: "demo123",
    level: 15,
    rating: 1450,
    streak: 12,
    stats: {
      logicXp: 2100,
      eruditionXp: 1800,
      strategyXp: 2400,
      rhetoricXp: 1200,
      intuitionXp: 980,
    },
  },
  {
    name: "Дмитрий",
    email: "dmitry@demo.razum.app",
    password: "demo123",
    level: 22,
    rating: 1680,
    streak: 31,
    stats: {
      logicXp: 4200,
      eruditionXp: 3100,
      strategyXp: 3800,
      rhetoricXp: 2600,
      intuitionXp: 1950,
    },
  },
  {
    name: "Максим",
    email: "max@demo.razum.app",
    password: "demo123",
    level: 8,
    rating: 1200,
    streak: 5,
    stats: {
      logicXp: 1100,
      eruditionXp: 800,
      strategyXp: 950,
      rhetoricXp: 600,
      intuitionXp: 450,
    },
  },
  {
    name: "Артём",
    email: "artem@demo.razum.app",
    password: "demo123",
    level: 18,
    rating: 1520,
    streak: 20,
    stats: {
      logicXp: 3200,
      eruditionXp: 2400,
      strategyXp: 2900,
      rhetoricXp: 1800,
      intuitionXp: 1400,
    },
  },
  {
    name: "Кирилл",
    email: "kirill@demo.razum.app",
    password: "demo123",
    level: 25,
    rating: 1750,
    streak: 45,
    stats: {
      logicXp: 5100,
      eruditionXp: 3900,
      strategyXp: 4700,
      rhetoricXp: 3200,
      intuitionXp: 2800,
    },
  },
];

// Главный аккаунт для инвестора — средний уровень, чтобы было видно
// и прогресс (что уже достигнуто), и потенциал роста (куда ещё расти)
const investorUser: DemoUser = {
  name: "Инвестор",
  email: "investor@demo.razum.app",
  password: "razum2026",
  level: 10,
  rating: 1350,
  streak: 7,
  stats: {
    logicXp: 1500,
    eruditionXp: 1200,
    strategyXp: 1600,
    rhetoricXp: 900,
    intuitionXp: 700,
  },
};

// ── Demo Battles ────────────────────────────────────────────

interface DemoBattle {
  player1Index: number; // индекс в массиве allUsers (0-4: demoUsers, 5: investor)
  player2Index: number;
  winnerIndex: number;
  player1Score: number;
  player2Score: number;
  category: string;
  daysAgo: number; // сколько дней назад состоялся батл
}

// 10 батлов с разнообразными результатами:
// - Разные счёта (5:0, 5:1, 5:2, 4:3, 4:2, 4:1, 3:2)
// - Не все побеждают один игрок — реалистичный расклад
// - Инвестор участвует в 2 батлах: 1 победа, 1 поражение
const demoBattles: DemoBattle[] = [
  // Кирилл (25 lvl) — лидер рейтинга, но проигрывает Дмитрию в логике
  { player1Index: 4, player2Index: 1, winnerIndex: 4, player1Score: 5, player2Score: 2, category: "Стратегическое мышление", daysAgo: 1 },
  { player1Index: 1, player2Index: 4, winnerIndex: 1, player1Score: 4, player2Score: 3, category: "Логические ошибки", daysAgo: 2 },

  // Дмитрий (22 lvl) — второй по силе, доминирует в своих матчах
  { player1Index: 1, player2Index: 3, winnerIndex: 1, player1Score: 5, player2Score: 1, category: "Критическое мышление", daysAgo: 3 },
  { player1Index: 1, player2Index: 0, winnerIndex: 1, player1Score: 4, player2Score: 2, category: "Когнитивные искажения", daysAgo: 5 },

  // Артём (18 lvl) — крушит Максима, но уступает Александру
  { player1Index: 3, player2Index: 2, winnerIndex: 3, player1Score: 5, player2Score: 0, category: "Первые принципы", daysAgo: 4 },
  { player1Index: 0, player2Index: 3, winnerIndex: 0, player1Score: 3, player2Score: 2, category: "Инверсия", daysAgo: 6 },

  // Александр (15 lvl) — стабильный середняк
  { player1Index: 0, player2Index: 2, winnerIndex: 0, player1Score: 4, player2Score: 1, category: "Стратегическое мышление", daysAgo: 7 },

  // Максим (8 lvl) — новичок, но однажды побеждает Александра (апсет!)
  { player1Index: 2, player2Index: 0, winnerIndex: 2, player1Score: 3, player2Score: 2, category: "Когнитивные искажения", daysAgo: 8 },

  // Инвестор — побеждает Максима, проигрывает Александру
  { player1Index: 5, player2Index: 2, winnerIndex: 5, player1Score: 4, player2Score: 2, category: "Первые принципы", daysAgo: 1 },
  { player1Index: 5, player2Index: 0, winnerIndex: 0, player1Score: 2, player2Score: 3, category: "Логические ошибки", daysAgo: 2 },
];

// ── Helpers ─────────────────────────────────────────────────

function daysAgoDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function todayMidnight(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("======================================================");
  console.log("       РАЗУМ -- Demo Seed для инвесторов");
  console.log("======================================================");
  console.log("");

  // ── 1. Создаём demo-пользователей ─────────────────────────

  const allUsers = [...demoUsers, investorUser];
  const createdUserIds: string[] = [];

  // Хешируем пароли заранее (bcrypt — async)
  const passwordHashes = new Map<string, string>();
  for (const u of allUsers) {
    if (!passwordHashes.has(u.password)) {
      passwordHashes.set(u.password, await bcrypt.hash(u.password, BCRYPT_ROUNDS));
    }
  }

  console.log("-- Пользователи --------------------------------------");

  for (const u of allUsers) {
    const passwordHash = passwordHashes.get(u.password)!;

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
      },
    });

    // Upsert stats
    await prisma.userStats.upsert({
      where: { userId: user.id },
      update: {
        logicXp: u.stats.logicXp,
        eruditionXp: u.stats.eruditionXp,
        strategyXp: u.stats.strategyXp,
        rhetoricXp: u.stats.rhetoricXp,
        intuitionXp: u.stats.intuitionXp,
        rating: u.rating,
        streakDays: u.streak,
        streakDate: todayMidnight(),
      },
      create: {
        userId: user.id,
        logicXp: u.stats.logicXp,
        eruditionXp: u.stats.eruditionXp,
        strategyXp: u.stats.strategyXp,
        rhetoricXp: u.stats.rhetoricXp,
        intuitionXp: u.stats.intuitionXp,
        rating: u.rating,
        streakDays: u.streak,
        streakDate: todayMidnight(),
      },
    });

    createdUserIds.push(user.id);

    const totalXp =
      u.stats.logicXp +
      u.stats.eruditionXp +
      u.stats.strategyXp +
      u.stats.rhetoricXp +
      u.stats.intuitionXp;

    const isInvestor = u.email === "investor@demo.razum.app";
    const marker = isInvestor ? " [MAIN]" : "";

    console.log(
      `  + ${u.name.padEnd(12)} lvl ${String(u.level).padStart(2)} | ` +
        `rating ${u.rating} | streak ${String(u.streak).padStart(2)}d | ` +
        `XP ${totalXp}${marker}`
    );
  }

  console.log(`\n  Итого: ${allUsers.length} пользователей создано/обновлено`);

  // ── 2. Создаём demo-батлы ─────────────────────────────────

  console.log("\n-- Батлы ---------------------------------------------");

  // Удаляем старые demo-батлы (между demo-юзерами) для идемпотентности.
  // Сначала раунды (FK), потом батлы.
  const demoUserIds = createdUserIds;
  await prisma.battleRound.deleteMany({
    where: {
      battle: {
        player1Id: { in: demoUserIds },
        player2Id: { in: demoUserIds },
      },
    },
  });
  await prisma.battle.deleteMany({
    where: {
      player1Id: { in: demoUserIds },
      player2Id: { in: demoUserIds },
    },
  });

  // Получаем вопросы для раундов батлов
  const questions = await prisma.question.findMany({
    where: { isActive: true },
    take: 100,
  });

  if (questions.length === 0) {
    console.log("  ! Нет вопросов в БД. Сначала запустите основной seed: pnpm db:seed");
    console.log("  ! Батлы будут созданы без раундов.");
  }

  let battleCount = 0;

  for (const b of demoBattles) {
    const p1Id = createdUserIds[b.player1Index];
    const p2Id = createdUserIds[b.player2Index];
    const winnerId = createdUserIds[b.winnerIndex];

    const battleDate = daysAgoDate(b.daysAgo);
    const endDate = new Date(battleDate.getTime() + 10 * 60 * 1000); // +10 мин

    const battleId = randomUUID();

    const battle = await prisma.battle.create({
      data: {
        id: battleId,
        player1Id: p1Id,
        player2Id: p2Id,
        winnerId: winnerId,
        status: BattleStatus.COMPLETED,
        mode: BattleMode.SIEGE,
        category: b.category,
        player1Score: b.player1Score,
        player2Score: b.player2Score,
        startedAt: battleDate,
        endedAt: endDate,
        createdAt: battleDate,
        state: {
          phase: "finished",
          currentRound: b.player1Score + b.player2Score,
          totalRounds: b.player1Score + b.player2Score,
        },
      },
    });

    // Создаём раунды для батла (если есть вопросы в БД)
    if (questions.length > 0) {
      const totalRounds = b.player1Score + b.player2Score;
      let p1Wins = 0;
      let p2Wins = 0;

      for (let r = 0; r < totalRounds; r++) {
        // Чередуем атакующих: чётный раунд — p1, нечётный — p2
        const isP1Attacking = r % 2 === 0;
        const attackerId = isP1Attacking ? p1Id : p2Id;

        // Распределяем правильные ответы так, чтобы финальный счёт совпал
        let isCorrect: boolean;
        if (isP1Attacking) {
          isCorrect = p1Wins < b.player1Score;
          if (isCorrect) p1Wins++;
        } else {
          isCorrect = p2Wins < b.player2Score;
          if (isCorrect) p2Wins++;
        }

        const question = questions[r % questions.length];

        await prisma.battleRound.create({
          data: {
            id: randomUUID(),
            battleId: battle.id,
            roundNumber: r + 1,
            attackerId,
            questionId: question.id,
            difficulty: question.difficulty,
            answerIndex: isCorrect
              ? question.correctIndex
              : (question.correctIndex + 1) % 4,
            isCorrect,
            defenseType: isCorrect ? "ACCEPT" : null,
            timeTakenMs: 3000 + Math.floor(Math.random() * 12000), // 3-15 сек
            points: isCorrect
              ? question.difficulty === "GOLD"
                ? 3
                : question.difficulty === "SILVER"
                  ? 2
                  : 1
              : 0,
          },
        });
      }
    }

    const p1Name = allUsers[b.player1Index].name;
    const p2Name = allUsers[b.player2Index].name;
    const winnerName = allUsers[b.winnerIndex].name;

    console.log(
      `  + ${p1Name} vs ${p2Name} -- ${b.player1Score}:${b.player2Score} ` +
        `(${winnerName} wins) | ${b.category}`
    );
    battleCount++;
  }

  console.log(`\n  Итого: ${battleCount} батлов создано`);

  // ── 3. Итоговая статистика ────────────────────────────────

  const totalUsers = await prisma.user.count();
  const totalBattles = await prisma.battle.count();
  const totalQuestions = await prisma.question.count();

  console.log("");
  console.log("======================================================");
  console.log("             Demo-среда готова!");
  console.log("------------------------------------------------------");
  console.log(`  Пользователей в БД:  ${totalUsers}`);
  console.log(`  Батлов в БД:         ${totalBattles}`);
  console.log(`  Вопросов в БД:       ${totalQuestions}`);
  console.log("------------------------------------------------------");
  console.log("");
  console.log("  Аккаунт для демо инвестору:");
  console.log("    Email:    investor@demo.razum.app");
  console.log("    Пароль:   razum2026");
  console.log("");
  console.log("  Demo-аккаунты (пароль: demo123):");
  console.log("    alex@demo.razum.app     (lvl 15, rating 1450)");
  console.log("    dmitry@demo.razum.app   (lvl 22, rating 1680)");
  console.log("    max@demo.razum.app      (lvl  8, rating 1200)");
  console.log("    artem@demo.razum.app    (lvl 18, rating 1520)");
  console.log("    kirill@demo.razum.app   (lvl 25, rating 1750)");
  console.log("");
  console.log("======================================================");
  console.log("");
}

main()
  .catch((e) => {
    console.error("Ошибка при seed-demo:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
