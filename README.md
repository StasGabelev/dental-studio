# Dental Studio — Project Passport

## Загальний огляд

Повна автоматизація стоматологічної клініки Dental Studio (Чернігів):
- Сайт з динамічним контентом
- Адмін-панель для управління клінікою
- Telegram-бот для пацієнтів
- AI-асистент Люся для адміна
- Автоматичні розсилки та нагадування
- Синхронізація з CRM Cliniccards

---

## Стек технологій

| Компонент | Технологія |
|-----------|-----------|
| Бекенд VPS | Node.js + Express, pm2 |
| База даних | Supabase (PostgreSQL) |
| CRM | Cliniccards API |
| AI | OpenRouter (Gemini Flash / Claude Sonnet) |
| Telegram | node-telegram-bot-api |
| Хостинг сайту | GitHub + FTP (Hostinger) |
| Бекенд | Hostinger VPS `/root/dental-ai/` |

---

## Supabase (актуальні дані після міграції червень 2026)

| Параметр | Значення |
|----------|---------|
| Project URL | `https://ipuksuzlvyoosmlqzvkb.supabase.co` |
| DB host | `db.ipuksuzlvyoosmlqzvkb.supabase.co` |
| DB password | зберігається окремо |
| Старий проект | `ladeofbnhqcxjaomlvbx` — видалено (перевищення egress) |

---

## Деплой на VPS (обов'язковий порядок)

**pm2 не читає `.env` автоматично** — потрібно передавати змінні явно:

```bash
# 1. Завантажити новий файл
wget -O /root/dental-ai/omni-bot-server.js https://raw.githubusercontent.com/StasGabelev/dental-studio/main/omni-bot-server.js

# 2. Якщо змінювався campaign-runner.js
wget -O /root/dental-ai/campaign-runner.js https://raw.githubusercontent.com/StasGabelev/dental-studio/main/campaign-runner.js

# 3. Зупинити і запустити з env vars
pm2 stop dental-ai-hub && SUPABASE_URL=https://ipuksuzlvyoosmlqzvkb.supabase.co SUPABASE_KEY=<KEY> pm2 start /root/dental-ai/omni-bot-server.js --name dental-ai-hub

# 4. Перевірити логи через 30 сек
pm2 logs dental-ai-hub --lines 15 --nostream
```

Ознаки успішного запуску в логах:
```
🚀 AI Omni-Server running on port 3000
🤖 Initializing Patient Telegram Bot...
🌸 Lusya agent initialized.
📣 Campaign Runner initialized.
```

**Якщо змінювалась lusya-agent.js** — після деплою виконати в Supabase SQL Editor:
```sql
DELETE FROM lusya_sessions;
```

---

## Ключові файли

| Файл | Призначення |
|------|-------------|
| `omni-bot-server.js` | Головний сервер: Telegram-бот, CRON синхронізація, AI чат |
| `campaign-runner.js` | Автоматичні flow: опитування, нагадування, follow-up |
| `lusya-agent.js` | AI-асистент Люся для адміна |
| `admin/admin_v3.js` | Логіка адмін-панелі |
| `admin/panel.html` | Інтерфейс адмін-панелі |
| `main.js` | Логіка публічного сайту |
| `chat-widget.js` | Чат-віджет на сайті |

---

## Telegram-бот для пацієнтів

**Токен:** `tg_patient_bot_token` в `ai_settings`

### Кнопки головного меню:
| Кнопка | Функція |
|--------|---------|
| 📅 Записатися онлайн | Посилання на Cliniccards booking |
| 📋 Моя історія | Історія візитів з іменами, лікарями, послугами, сумами |
| 👨‍⚕️ Мої лікарі | Лікарі по членах сім'ї з датами візитів |
| 🤝 Наші партнери | Партнери зі знижками |
| 📍 Як нас знайти | Адреса + Google Maps |
| ⭐ Залишити відгук | Посилання на Google Maps відгуки |
| 📞 Зворотний дзвінок | Сповіщення адміну з іменем і телефоном пацієнта |

### Прив'язка пацієнта:
1. Пацієнт натискає `/start`
2. Ділиться номером телефону (кнопка Telegram)
3. Бот знаходить пацієнта в `cc_patients` по телефону
4. Зберігає `telegram_id` в `cc_patients`
5. Показує головне меню

---

## Автоматичні Flow (campaign-runner.js)

### 1. Опитування після візиту
- Тригер: через 3 год після закінчення візиту (статус VISITED)
- Кнопки: 💚 Відмінно / 💛 Добре / 🔴 Погано
- Добре/Відмінно → кнопка "Залишити відгук на Google Maps"
- Погано → "Написати власнику клініки" → текст пересилається адміну

### 2. Нагадування про запис
- Запускається о **09:00** і **17:00** за Києвом
- Перевіряє візити зі статусом PLANNED на завтра
- Кнопки: ✅ Підтверджую / 📞 Потрібна допомога
- При відповіді — сповіщення адміну з іменем, телефоном і Telegram-посиланням

### 3. Follow-up після процедури (багатоповідомленний)
Процедури, що запускають серію повідомлень:

| Процедура | Повідомлення 1 | Повідомлення 2 | Повідомлення 3 |
|-----------|---------------|---------------|---------------|
| Видалення зуба | Через 2 год (рекомендації) | Через 20 год (як самопочуття?) | Через 72 год (загоєння) |
| Імплантація | Через 3 год (рекомендації) | Через 24 год (стан?) | Через 168 год (тиждень) |

Тригер: при синхронізації нових інвойсів (вік < 2 год) з ключовими словами процедур.

### 4. День народження
- Щодня перевіряє пацієнтів з днем народження сьогодні
- Надсилає привітання з побажаннями

### 5. Реактивація (90+ днів без візиту)
- Раз на 90 днів нагадування пацієнтам які давно не приходили

---

## Люся — AI-асистент для адміна

**Файл:** `lusya-agent.js`  
**Доступ:** Telegram-бот адміна (токен `lusya_bot_token` в `ai_settings`)

### Можливості:
- Статистика бази пацієнтів (стать, ДН, телефони, Telegram-підписники)
- Пошук пацієнтів за іменем, телефоном, датою візиту
- Історія пацієнта по імені
- Фінансові звіти (виручка за período, топ пацієнти)
- Статистика візитів
- Іменинники (сьогодні, тиждень, місяць, наступний місяць)

---

## CRM Синхронізація (CRON)

| Що | Інтервал | Записів |
|----|----------|---------|
| Пацієнти | кожні 30 хв | ~9 750 |
| Візити | кожні 60 хв | ~1 000 (за останні 30 днів) |
| Інвойси | кожні 60 хв | ~200 (за останні 7 днів) |
| Лікарі | раз на добу | ~14 |

**Важливо:** вікно синхронізації візитів — 30 днів (не 2 роки). Стара записи зберігаються в базі, просто не перезаписуються.

---

## База даних — ключові таблиці

| Таблиця | Призначення |
|---------|-------------|
| `cc_patients` | Пацієнти (з `telegram_id`, `gender`, `dob`) |
| `cc_visits` | Візити (статус: PLANNED/VISITED) |
| `cc_invoices` | Інвойси (поле `items` — JSON масив послуг) |
| `cc_doctors` | Лікарі |
| `ai_settings` | Всі токени і налаштування |
| `messenger_users` | Прив'язка Telegram chatId до пацієнта |
| `lusya_sessions` | Контекст розмов Люсі |
| `flow_executions` | Лог виконання автоматичних flow (має `scheduled_at`) |
| `automated_flows` | Конфіг автоматичних flow |
| `campaigns` | Масові розсилки |
| `campaign_deliveries` | Лог доставки кампаній |
| `site_content` | Контент сайту |
| `partners` | Партнери зі знижками |

---

## Налаштування в адмін-панелі

### Розділ "Налаштування ІІ":
- `tg_patient_bot_token` — токен Telegram-бота для пацієнтів
- `tg_bot_token` — токен бота-сповіщувача (для адміна)
- `tg_chat_id` — chat ID адміна (дізнатись через @userinfobot)
- `api_key` — OpenRouter API key
- `cc_api_token` — Cliniccards API token

### Розділ "Сторінки" → "📲 Telegram & Форма":
- `telegram-bot-token` — токен для форми зворотного зв'язку на сайті
- `telegram-chat-id` — chat ID куди летять заявки з сайту

---

## Стать пацієнтів (gender)

Після збагачення (травень 2026): F: ~6 300, M: ~3 350, NULL: ~0

Захист від перезапису CRON:
- Тригер `auto_gender_trigger` в Supabase (BEFORE INSERT OR UPDATE)
- `omni-bot-server.js`: не перезаписує gender якщо CRM повертає null

---

## Google Maps відгуки

Посилання для відгуків: `https://g.page/r/CRieZR5gW2LwEAE/review`

---

## Корисні SQL запити

```sql
-- Статистика пацієнтів
SELECT gender, COUNT(*) FROM cc_patients GROUP BY gender;

-- Пацієнти з Telegram
SELECT COUNT(*) FROM cc_patients WHERE telegram_id IS NOT NULL;

-- Заплановані follow-up
SELECT * FROM flow_executions WHERE status='pending' AND scheduled_at IS NOT NULL ORDER BY scheduled_at;

-- Очистити сесії Люсі (після деплою)
DELETE FROM lusya_sessions;
```

---

## Важливі примітки

1. **Supabase egress**: Free план — 5 GB/міс. Після міграції новий проект. Моніторити в Supabase → Usage.
2. **pm2 і .env**: pm2 не читає .env автоматично. Завжди запускати з `SUPABASE_URL=... SUPABASE_KEY=... pm2 start`.
3. **Кеш Telegram клавіатури**: після зміни кнопок меню — пацієнт має написати `/start` або будь-яке повідомлення щоб меню оновилось.
4. **flow_id в flow_executions**: appointment_reminder і procedure_followup не мають flow_id (NULL) — це нормально після ALTER TABLE.
