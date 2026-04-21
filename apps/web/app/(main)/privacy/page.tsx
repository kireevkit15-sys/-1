import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — РАЗУМ",
  description: "Как РАЗУМ обрабатывает твои данные, кому передаёт и какие у тебя права.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalShell>
      <p className="text-sm text-text-muted mb-6">Дата вступления в силу: 2026-04-21</p>
      <h1>Политика конфиденциальности</h1>
      <p>
        Краткая человеческая версия ниже. Полная юридическая редакция — в{" "}
        <a href="https://github.com/razum-app/razum/blob/main/docs/legal/PRIVACY_POLICY.md" target="_blank" rel="noreferrer">
          репозитории проекта
        </a>. При расхождении трактовок приоритет у юридической редакции.
      </p>

      <h2>1. Какие данные собираем</h2>
      <ul>
        <li>Telegram ID / email при регистрации.</li>
        <li>Прогресс обучения, ответы на вопросы, диалоги с AI-наставником.</li>
        <li>Технические логи: IP, User-Agent, время активности.</li>
        <li>Ошибки приложения через Sentry (без cookie и Authorization-хедеров).</li>
      </ul>

      <h2>2. Для чего</h2>
      <ul>
        <li>Авторизация и хранение прогресса.</li>
        <li>Генерация ответов AI-наставника через Claude API (Anthropic).</li>
        <li>Защита от злоупотреблений (rate limit по IP).</li>
        <li>Агрегированная аналитика для улучшения продукта.</li>
      </ul>

      <h2>3. Кому передаём</h2>
      <p>Данные не продаём. Процессоры (обработчики по поручению):</p>
      <ul>
        <li>Anthropic — для работы AI-наставника.</li>
        <li>Telegram — если ты залогинен через Telegram.</li>
        <li>VPS-провайдер (ЕС) — хостинг.</li>
        <li>Sentry — отчёты об ошибках (с фильтром чувствительных полей).</li>
        <li>AWS S3 — шифрованные резервные копии.</li>
      </ul>

      <h2>4. Твои права</h2>
      <ul>
        <li>Экспорт данных: <a href="/settings/data/export">настройки → экспорт</a>.</li>
        <li>Удаление: <a href="/settings/data/delete">настройки → удалить аккаунт</a>.</li>
        <li>Исправление: <a href="/settings/profile">настройки → профиль</a>.</li>
        <li>Отзыв согласия на уведомления: команда <code>/stop</code> в Telegram-боте.</li>
        <li>Жалоба в надзорный орган по месту жительства.</li>
      </ul>

      <h2>5. Безопасность</h2>
      <p>
        TLS 1.2+, HSTS preload, bcrypt для паролей, ротация секретов раз в 90–180 дней, CSP, минимизация данных в логах.
        Если заметил уязвимость — пиши на <a href="mailto:security@razum.app">security@razum.app</a>.
      </p>

      <h2>6. Контакты</h2>
      <p>
        Приватность и запросы по данным: <a href="mailto:privacy@razum.app">privacy@razum.app</a>. Срок ответа — 30 дней.
      </p>

      <p className="text-sm text-text-muted mt-10">
        Документ — черновик команды разработки. До публичного запуска проходит юридическую проверку.
      </p>
    </LegalShell>
  );
}
