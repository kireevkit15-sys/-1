import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { WebhookService, WebhookEvent } from './webhook.service';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @ApiOperation({ summary: 'Зарегистрировать webhook endpoint (админ)' })
  @ApiResponse({ status: 201, description: 'Endpoint создан' })
  @Post()
  async register(@Body() body: { url: string; events: WebhookEvent[]; secret?: string }) {
    return this.webhookService.register(body);
  }

  @ApiOperation({ summary: 'Список webhook endpoints (админ)' })
  @Get()
  async list() {
    return this.webhookService.list();
  }

  @ApiOperation({ summary: 'Удалить webhook endpoint (админ)' })
  @ApiParam({ name: 'id', description: 'UUID endpoint' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.webhookService.remove(id);
  }

  @ApiOperation({ summary: 'Вкл/выкл webhook endpoint (админ)' })
  @ApiParam({ name: 'id', description: 'UUID endpoint' })
  @Post(':id/toggle')
  async toggle(@Param('id') id: string) {
    return this.webhookService.toggle(id);
  }

  @ApiOperation({ summary: 'История доставок webhook (админ)' })
  @ApiParam({ name: 'id', description: 'UUID endpoint' })
  @ApiQuery({ name: 'limit', required: false })
  @Get(':id/deliveries')
  async deliveries(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.webhookService.getDeliveries(id, limit ? parseInt(limit, 10) : 20);
  }
}
