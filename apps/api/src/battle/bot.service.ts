import { Injectable } from '@nestjs/common';
import { Difficulty, DefenseType } from '@razum/shared';

const BOT_ACCURACY = 0.6;

@Injectable()
export class BotService {
  /**
   * Choose a difficulty for the bot's attack turn.
   * Weighted random: 70% BRONZE, 20% SILVER, 10% GOLD.
   */
  chooseDifficulty(): Difficulty {
    const roll = Math.random();
    if (roll < 0.7) return Difficulty.BRONZE;
    if (roll < 0.9) return Difficulty.SILVER;
    return Difficulty.GOLD;
  }

  /**
   * Choose an answer for the bot.
   * Returns the correct answer 60% of the time, otherwise a random wrong answer.
   */
  chooseAnswer(
    correctIndex: number,
    optionsCount: number,
  ): { answerIndex: number; isCorrect: boolean } {
    const isCorrect = Math.random() < BOT_ACCURACY;

    if (isCorrect) {
      return { answerIndex: correctIndex, isCorrect: true };
    }

    // Pick a random wrong index
    let wrongIndex: number;
    do {
      wrongIndex = Math.floor(Math.random() * optionsCount);
    } while (wrongIndex === correctIndex && optionsCount > 1);

    return { answerIndex: wrongIndex, isCorrect: false };
  }

  /**
   * Choose a defense type for the bot.
   * 50% ACCEPT, 30% DISPUTE, 20% COUNTER.
   */
  chooseDefense(): DefenseType {
    const roll = Math.random();
    if (roll < 0.5) return DefenseType.ACCEPT;
    if (roll < 0.8) return DefenseType.DISPUTE;
    return DefenseType.COUNTER;
  }

  /**
   * Get a random thinking delay in milliseconds (2000-5000ms).
   */
  getThinkingDelay(): number {
    return 2000 + Math.floor(Math.random() * 3000);
  }

  /**
   * Wait for a simulated thinking delay.
   */
  async simulateThinking(): Promise<void> {
    const delay = this.getThinkingDelay();
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
