import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { LearnService } from './learn.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('learn')
@UseGuards(JwtAuthGuard)
export class LearnController {
  constructor(private readonly learnService: LearnService) {}

  @Get('topics')
  async getTopics() {
    return this.learnService.getTopics();
  }

  @Post('session')
  async startSession(
    @Request() req: any,
    @Body() body: { topicId: string; difficulty: string },
  ) {
    return this.learnService.startSession(
      req.user.sub,
      body.topicId,
      body.difficulty,
    );
  }
}
