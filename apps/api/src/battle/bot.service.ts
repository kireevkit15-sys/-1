import { Injectable } from '@nestjs/common';
import { Difficulty, DefenseType, Branch, BotLevel } from '@razum/shared';

/** Per-level bot configuration */
interface BotProfile {
  accuracy: number;
  difficultyWeights: [number, number, number]; // [bronze, silver, gold] thresholds
  defenseWeights: [number, number, number]; // [accept, dispute, counter] thresholds
  thinkingDelayMs: [number, number]; // [min, max]
}

const BOT_PROFILES: Record<BotLevel, BotProfile> = {
  [BotLevel.NOVICE]: {
    accuracy: 0.4,
    difficultyWeights: [0.85, 0.97, 1.0], // 85% bronze, 12% silver, 3% gold
    defenseWeights: [0.6, 0.85, 1.0], // 60% accept, 25% dispute, 15% counter
    thinkingDelayMs: [4000, 8000],
  },
  [BotLevel.STANDARD]: {
    accuracy: 0.6,
    difficultyWeights: [0.7, 0.9, 1.0], // 70% bronze, 20% silver, 10% gold
    defenseWeights: [0.5, 0.8, 1.0], // 50% accept, 30% dispute, 20% counter
    thinkingDelayMs: [3000, 6000],
  },
  [BotLevel.EXPERT]: {
    accuracy: 0.85,
    difficultyWeights: [0.3, 0.65, 1.0], // 30% bronze, 35% silver, 35% gold
    defenseWeights: [0.3, 0.6, 1.0], // 30% accept, 30% dispute, 40% counter
    thinkingDelayMs: [1000, 3000],
  },
};

const ALL_BRANCHES: Branch[] = [
  Branch.STRATEGY,
  Branch.LOGIC,
  Branch.ERUDITION,
  Branch.RHETORIC,
  Branch.INTUITION,
];

@Injectable()
export class BotService {
  private getProfile(level?: BotLevel): BotProfile {
    return BOT_PROFILES[level ?? BotLevel.STANDARD];
  }

  /**
   * Choose a branch for the bot's attack turn.
   */
  chooseBranch(availableBranches?: Branch[]): Branch {
    const branches = availableBranches && availableBranches.length > 0 ? availableBranches : ALL_BRANCHES;
    return branches[Math.floor(Math.random() * branches.length)]!;
  }

  /**
   * Choose a difficulty for the bot's attack turn.
   * Weights depend on bot level.
   */
  chooseDifficulty(level?: BotLevel): Difficulty {
    const profile = this.getProfile(level);
    const roll = Math.random();
    if (roll < profile.difficultyWeights[0]) return Difficulty.BRONZE;
    if (roll < profile.difficultyWeights[1]) return Difficulty.SILVER;
    return Difficulty.GOLD;
  }

  /**
   * Choose an answer for the bot.
   * Accuracy depends on bot level.
   */
  chooseAnswer(
    correctIndex: number,
    optionsCount: number,
    level?: BotLevel,
  ): { answerIndex: number; isCorrect: boolean } {
    const profile = this.getProfile(level);
    const isCorrect = Math.random() < profile.accuracy;

    if (isCorrect) {
      return { answerIndex: correctIndex, isCorrect: true };
    }

    let wrongIndex: number;
    do {
      wrongIndex = Math.floor(Math.random() * optionsCount);
    } while (wrongIndex === correctIndex && optionsCount > 1);

    return { answerIndex: wrongIndex, isCorrect: false };
  }

  /**
   * Choose a defense type for the bot.
   * Weights depend on bot level (expert counters more aggressively).
   */
  chooseDefense(level?: BotLevel): DefenseType {
    const profile = this.getProfile(level);
    const roll = Math.random();
    if (roll < profile.defenseWeights[0]) return DefenseType.ACCEPT;
    if (roll < profile.defenseWeights[1]) return DefenseType.DISPUTE;
    return DefenseType.COUNTER;
  }

  /**
   * Get a random thinking delay in milliseconds.
   * Expert bots respond faster, novice bots are slower.
   */
  getThinkingDelay(level?: BotLevel): number {
    const profile = this.getProfile(level);
    const [min, max] = profile.thinkingDelayMs;
    return min + Math.floor(Math.random() * (max - min));
  }

  /**
   * Wait for a simulated thinking delay.
   */
  async simulateThinking(level?: BotLevel): Promise<void> {
    const delay = this.getThinkingDelay(level);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Bot display name based on level.
   */
  getBotName(level?: BotLevel): string {
    switch (level) {
      case BotLevel.NOVICE:
        return 'РАЗУМ-бот (Новичок)';
      case BotLevel.EXPERT:
        return 'РАЗУМ-бот (Эксперт)';
      default:
        return 'РАЗУМ-бот';
    }
  }
}
