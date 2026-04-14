import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { BarrierService } from './barrier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DetermineDto } from './dto/determine.dto';
import { InteractDto } from './dto/interact.dto';
import { ExplainDto } from './dto/explain.dto';
import { BarrierRecallDto, BarrierConnectDto, BarrierApplyDto, BarrierDefendDto } from './dto/barrier.dto';

@ApiTags('Learning')
@ApiBearerAuth()
@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(
    private readonly learningService: LearningService,
    private readonly barrierService: BarrierService,
  ) {}

  @Post('determine')
  @ApiOperation({ summary: 'Initial determination — 5 situations to set start zone, pain point, style' })
  async determine(
    @Request() req: { user: { sub: string } },
    @Body() dto: DetermineDto,
  ) {
    return this.learningService.determine(req.user.sub, dto);
  }

  @Post('start')
  @ApiOperation({ summary: 'Create learning path and build personal route' })
  async start(
    @Request() req: { user: { sub: string } },
    @Body() body: { startZone?: string; painPoint?: string; deliveryStyle?: string },
  ) {
    const determination = body.startZone
      ? { startZone: body.startZone, painPoint: body.painPoint ?? '', deliveryStyle: body.deliveryStyle ?? '' }
      : undefined;
    return this.learningService.start(req.user.sub, determination);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s lesson cards' })
  async getToday(@Request() req: { user: { sub: string } }) {
    return this.learningService.getToday(req.user.sub);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current learning status — level, day, progress' })
  async getStatus(@Request() req: { user: { sub: string } }) {
    return this.learningService.getStatus(req.user.sub);
  }

  @Post('interact')
  @ApiOperation({ summary: 'Record interaction with a card (view, answer, deeper, complete)' })
  async interact(
    @Request() req: { user: { sub: string } },
    @Body() dto: InteractDto,
  ) {
    return this.learningService.interact(req.user.sub, dto);
  }

  @Post('explain')
  @ApiOperation({ summary: 'Submit "in your own words" explanation for AI grading' })
  async explain(
    @Request() req: { user: { sub: string } },
    @Body() dto: ExplainDto,
  ) {
    return this.learningService.gradeExplanation(req.user.sub, dto);
  }

  @Get('depth/:conceptId')
  @ApiOperation({ summary: 'Get depth layers for a concept (science, book, philosophy, etc.)' })
  @ApiParam({ name: 'conceptId', type: 'string', format: 'uuid' })
  async getDepth(
    @Request() req: { user: { sub: string } },
    @Param('conceptId', ParseUUIDPipe) conceptId: string,
  ) {
    return this.learningService.getDepthLayers(req.user.sub, conceptId);
  }

  @Post('day/:dayNumber/complete')
  @ApiOperation({ summary: 'Complete a learning day, advance to next' })
  @ApiParam({ name: 'dayNumber', type: 'number' })
  async completeDay(
    @Request() req: { user: { sub: string } },
    @Param('dayNumber', ParseIntPipe) dayNumber: number,
  ) {
    return this.learningService.completeDay(req.user.sub, dayNumber);
  }

  // ── Barrier endpoints (B22) ─────────────────────────────────────────

  @Get('barrier')
  @ApiOperation({ summary: 'Get or create barrier challenge for current level' })
  async getBarrier(@Request() req: { user: { sub: string } }) {
    return this.barrierService.getBarrier(req.user.sub);
  }

  @Post('barrier/recall')
  @ApiOperation({ summary: 'Submit recall stage answers (6 short answers)' })
  async submitRecall(
    @Request() req: { user: { sub: string } },
    @Body() dto: BarrierRecallDto,
  ) {
    return this.barrierService.submitRecall(req.user.sub, dto);
  }

  @Post('barrier/connect')
  @ApiOperation({ summary: 'Submit connect stage — explain connections between concept pairs' })
  async submitConnect(
    @Request() req: { user: { sub: string } },
    @Body() dto: BarrierConnectDto,
  ) {
    return this.barrierService.submitConnect(req.user.sub, dto);
  }

  @Post('barrier/apply')
  @ApiOperation({ summary: 'Submit apply stage — apply concepts to new situations' })
  async submitApply(
    @Request() req: { user: { sub: string } },
    @Body() dto: BarrierApplyDto,
  ) {
    return this.barrierService.submitApply(req.user.sub, dto);
  }

  @Post('barrier/defend')
  @ApiOperation({ summary: 'Submit defend stage — debate with AI opponent (3-4 rounds)' })
  async submitDefend(
    @Request() req: { user: { sub: string } },
    @Body() dto: BarrierDefendDto,
  ) {
    return this.barrierService.submitDefend(req.user.sub, dto);
  }

  @Post('barrier/complete')
  @ApiOperation({ summary: 'Complete barrier — calculate total score, pass/fail, advance level' })
  async completeBarrier(@Request() req: { user: { sub: string } }) {
    return this.barrierService.completeBarrier(req.user.sub);
  }

  @Get('barrier/retake')
  @ApiOperation({ summary: 'Get retake info — weak concepts, days to review' })
  async getRetakeInfo(@Request() req: { user: { sub: string } }) {
    return this.barrierService.getRetakeInfo(req.user.sub);
  }
}
