/**
 * Telegram Login Widget authentication.
 *
 * Unlike OAuth providers, Telegram uses HMAC-SHA256 hash validation
 * instead of a redirect flow. The actual validation logic lives in
 * AuthService.validateTelegramHash() — called from AuthController.telegramLogin().
 *
 * This file documents the strategy for consistency with the auth module structure.
 * No Passport strategy is needed because Telegram sends all data in a single POST.
 *
 * Flow:
 * 1. Frontend shows Telegram Login Widget
 * 2. Widget returns user data + HMAC hash to frontend
 * 3. Frontend POSTs to /auth/telegram with TelegramLoginDto
 * 4. AuthService.validateTelegramHash() verifies HMAC using BOT_TOKEN
 * 5. User is created or found, JWT tokens are returned
 */
export const TELEGRAM_STRATEGY_NAME = 'telegram';
