import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'РАЗУМ API',
      version: '0.1.0',
      apiVersion: 'v1',
      status: 'running',
      docs: '/docs',
      endpoints: {
        auth: {
          'POST /v1/auth/register': 'Регистрация по email',
          'POST /v1/auth/login': 'Вход по email',
          'POST /v1/auth/telegram': 'Вход через Telegram',
          'POST /v1/auth/refresh': 'Обновить токены',
        },
        users: {
          'GET /v1/users/me': 'Мой профиль (Bearer token)',
          'PATCH /v1/users/me': 'Обновить профиль',
          'GET /v1/users/:id/profile': 'Публичный профиль',
        },
        health: {
          'GET /health': 'Быстрая проверка (без /v1/)',
          'GET /ready': 'Проверка зависимостей (без /v1/)',
        },
      },
    };
  }
}
