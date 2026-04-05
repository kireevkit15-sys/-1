import { Injectable } from '@nestjs/common';

const DEFENSE_TYPES = ['shield', 'dodge', 'counter'] as const;
const BOT_ACCURACY = 0.6;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;

interface BotAnswer {
  answer: string;
  correct: boolean;
}

@Injectable()
export class BotService {
  /**
   * Generate a bot answer for a question.
   * Bot answers correctly with BOT_ACCURACY probability.
   */
  generateBotAnswer(correctAnswer: string, options: string[]): BotAnswer {
    const isCorrect = Math.random() < BOT_ACCURACY;

    if (isCorrect) {
      return { answer: correctAnswer, correct: true };
    }

    // Pick a random wrong answer
    const wrongOptions = options.filter((opt) => opt !== correctAnswer);
    const randomWrong =
      wrongOptions[Math.floor(Math.random() * wrongOptions.length)] ||
      correctAnswer;

    return { answer: randomWrong, correct: false };
  }

  /**
   * Generate a random defense type for the bot.
   * Returns null 40% of the time (no defense).
   */
  generateBotDefense(): string | null {
    if (Math.random() < 0.4) {
      return null;
    }
    return DEFENSE_TYPES[Math.floor(Math.random() * DEFENSE_TYPES.length)]!;
  }

  /**
   * Generate a random bot difficulty level.
   */
  generateBotDifficulty(): string {
    const difficulties = ['easy', 'medium', 'hard'];
    return difficulties[Math.floor(Math.random() * difficulties.length)]!;
  }

  /**
   * Get a random delay in milliseconds to simulate bot "thinking".
   */
  getSimulatedDelay(): number {
    return (
      MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS))
    );
  }

  /**
   * Wait for the simulated delay. Use in async contexts.
   */
  async simulateThinking(): Promise<void> {
    const delay = this.getSimulatedDelay();
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
