import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { SubscribePushDto } from './dto/subscribe.dto';
import { UnsubscribePushDto } from './dto/unsubscribe.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({ status: 201, description: 'Subscribed successfully' })
  async subscribe(
    @Request() req: { user: { sub: string } },
    @Body() dto: SubscribePushDto,
  ) {
    return this.notificationService.subscribe(req.user.sub, {
      endpoint: dto.endpoint,
      p256dh: dto.p256dh,
      auth: dto.auth,
    });
  }

  @Delete('subscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  async unsubscribe(
    @Request() req: { user: { sub: string } },
    @Body() dto: UnsubscribePushDto,
  ) {
    const removed = await this.notificationService.unsubscribe(
      req.user.sub,
      dto.endpoint,
    );
    return { removed };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List current push subscriptions' })
  @ApiResponse({ status: 200, description: 'List of active push subscriptions' })
  async getSubscriptions(@Request() req: { user: { sub: string } }) {
    return this.notificationService.getUserSubscriptions(req.user.sub);
  }
}
