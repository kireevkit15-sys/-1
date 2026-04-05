import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private client: Anthropic;
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY', ''),
    });
  }

  async generateExplanation(
    question: string,
    correctAnswer: string,
    userAnswer: string,
  ): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Вопрос: "${question}"\nПравильный ответ: "${correctAnswer}"\nОтвет пользователя: "${userAnswer}"\n\nОбъясни кратко и понятно, почему правильный ответ именно такой. Если пользователь ответил неправильно, объясни его ошибку. Отвечай на русском языке.`,
          },
        ],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      return textBlock ? textBlock.text : 'Объяснение недоступно.';
    } catch (error) {
      this.logger.error('Failed to generate AI explanation', error);
      return 'Не удалось сгенерировать объяснение.';
    }
  }

  async generateHint(question: string, options: string[]): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Вопрос: "${question}"\nВарианты: ${options.join(', ')}\n\nДай небольшую подсказку, не раскрывая правильный ответ напрямую. Отвечай на русском языке.`,
          },
        ],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      return textBlock ? textBlock.text : 'Подсказка недоступна.';
    } catch (error) {
      this.logger.error('Failed to generate AI hint', error);
      return 'Не удалось сгенерировать подсказку.';
    }
  }
}
