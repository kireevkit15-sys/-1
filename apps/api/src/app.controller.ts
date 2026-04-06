import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'РАЗУМ API',
      version: '0.1.0',
      status: 'running',
      endpoints: {
        auth: {
          'POST /auth/register': 'Регистрация по email',
          'POST /auth/login': 'Вход по email',
          'POST /auth/telegram': 'Вход через Telegram',
          'POST /auth/refresh': 'Обновить токены',
        },
        users: {
          'GET /users/me': 'Мой профиль (Bearer token)',
          'PATCH /users/me': 'Обновить профиль',
          'GET /users/:id/profile': 'Публичный профиль',
        },
      },
    };
  }
}
