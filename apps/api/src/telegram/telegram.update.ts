import { Injectable, Logger } from '@nestjs/common';
import { Command, Ctx, Help, Start, Update } from 'nestjs-telegraf';
import type { Context } from 'telegraf';
import { TelegramCommandService } from './telegram-command.service';
import { getErrorMessage } from '../common/utils/error.util';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(private readonly commands: TelegramCommandService) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    try {
      const from = ctx.from;
      const chat = ctx.chat;
      if (!from || !chat) return;

      const text = await this.commands.buildWelcomeMessage(BigInt(from.id), BigInt(chat.id));
      await ctx.reply(text, { link_preview_options: { is_disabled: true } });
    } catch (err: unknown) {
      this.logger.error(`/start failed: ${getErrorMessage(err)}`);
    }
  }

  @Help()
  async onHelp(@Ctx() ctx: Context): Promise<void> {
    try {
      await ctx.reply(this.commands.buildHelpMessage(), {
        link_preview_options: { is_disabled: true },
      });
    } catch (err: unknown) {
      this.logger.error(`/help failed: ${getErrorMessage(err)}`);
    }
  }

  @Command('stats')
  async onStats(@Ctx() ctx: Context): Promise<void> {
    try {
      const from = ctx.from;
      if (!from) return;
      const text = await this.commands.buildStatsMessage(BigInt(from.id));
      await ctx.reply(text);
    } catch (err: unknown) {
      this.logger.error(`/stats failed: ${getErrorMessage(err)}`);
    }
  }

  @Command('leaderboard')
  async onLeaderboard(@Ctx() ctx: Context): Promise<void> {
    try {
      const text = await this.commands.buildLeaderboardMessage();
      await ctx.reply(text);
    } catch (err: unknown) {
      this.logger.error(`/leaderboard failed: ${getErrorMessage(err)}`);
    }
  }
}
