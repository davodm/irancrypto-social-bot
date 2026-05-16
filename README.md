# IranCrypto Market Social Media Bot

Automates daily, weekly, and monthly crypto market updates across Twitter, Instagram, and Telegram using Node.js and AWS Lambda. Fetches data from the [IranCrypto Market API](https://irancrypto.market/api/), generates AI-powered content, and publishes on schedule.

## Features

- **Crypto Market Data** — Fetches daily/weekly/monthly rankings from the IranCrypto Market API.
- **AI Content Generation** — Uses OpenAI, OpenRouter, DeepSeek, Groq, or Together AI to write engaging tweets and Instagram captions with automatic provider fallback.
- **Image Generation** — Generates Instagram-ready images from Handlebars templates using Puppeteer + Chromium on Lambda.
- **Twitter** — Posts daily tweets about market trends and volume via [Twitter API V2](https://www.npmjs.com/package/twitter-api-v2).
- **Instagram** — Weekly coin recaps and monthly exchange recaps via pluggable providers:
  - [Ayrshare](https://www.ayrshare.com/) — social media scheduling API
  - [Late](https://docs.getlate.dev/) — social media API with presigned media uploads
- **Telegram** — Daily recap images posted to a channel via [Telegram Bot API](https://www.npmjs.com/package/node-telegram-bot-api).
- **Serverless** — Runs on AWS Lambda with cron scheduling, zero maintenance.
- **Error Tracking** — Integrated Sentry support for production monitoring.

## Architecture

```
scheduler.js (cron: 23:59 Iran time)
  └── Fetches data → schedules posts in DynamoDB

poster.js (cron: every hour)
  └── Reads scheduled posts → creates content → publishes
        ├── src/content.js        → orchestrates tweet/instagram/telegram
        ├── src/twitter.js        → Twitter API V2
        ├── src/instagram.js      → provider router (INSTAGRAM_PROVIDER env var)
        │     ├── src/providers/ayrshare.js   → Ayrshare API
        │     └── src/providers/late.js       → Late API
        ├── src/ai/               → AI content generation (multi-provider)
        ├── src/html.js           → Puppeteer image generation
        └── node-telegram-bot-api → Telegram channel posting
```

### Instagram Provider System

Instagram posting is handled by a pluggable provider system. Set `INSTAGRAM_PROVIDER` in your `.env` to choose which service handles publishing:

| Provider | Env Var | Description |
|----------|---------|-------------|
| `ayrshare` (default) | `AYRSHARE_API_KEY` | Posts via [Ayrshare](https://www.ayrshare.com/) social media API |
| `late` | `LATE_API_KEY` + `LATE_IG_ACCOUNT_ID` | Posts via [Late API](https://docs.getlate.dev/platforms/instagram) with presigned media upload |

Both providers expose the same interface (`publishImage`, `publishVideo`, `publishStory`), so switching is just an env var change.

### Scheduled Posts

| Platform | Target | Schedule | Content |
|----------|--------|----------|---------|
| Telegram | Daily recap | Daily 9 AM | Top 10 coins by volume |
| Twitter | Trends | Daily 9 AM | Top 3 coins tweet |
| Twitter | Volume | Daily 10 AM | Total market volume tweet |
| Instagram | Weekly coin | Friday 9 AM | Top 10 coins image + AI caption |
| Instagram | Monthly exchange | Last day of month 9 AM | Top 5 exchanges image + AI caption |

## Quick Start

### 1. Install

```bash
git clone https://github.com/davodm/irancrypto-social-bot.git
cd irancrypto-social-bot
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your API keys and credentials
```

See [Environment Variables](#environment-variables) for details on each variable.

### 3. Authenticate Twitter

Twitter requires OAuth2 tokens generated via a CLI tool:

1. Set up a [Twitter Developer](https://developer.twitter.com/) app with OAuth2 and a callback URL — the app **must be attached to a Project** in the Developer Console
2. Set `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, and `TWITTER_CALLBACK_URL` in `.env`
3. Run the auth tool:

```bash
npm run auth:twitter
```

4. Open the printed URL in your browser and authorize the app
5. Paste the full redirect URL back into the terminal

The script will exchange the code for tokens and automatically update `TWITTER_ACCESS_TOKEN` and `TWITTER_REFRESH_TOKEN` in your `.env` file.

Read more about the [Twitter OAuth2 flow](https://github.com/PLhery/node-twitter-api-v2/blob/712ca82293c1b587638055537969dbec5a7bce40/doc/auth.md#user-wide-authentication-flow).

### 4. Connect Instagram

Depending on your chosen provider:

**Ayrshare** — Create an account at [ayrshare.com](https://www.ayrshare.com/), connect your Instagram Business/Creator account, and copy your API key to `AYRSHARE_API_KEY`.

**Late** — Create an account at [getlate.dev](https://getlate.dev/), connect your Instagram Business/Creator account via OAuth, get your account ID from the dashboard, then set `LATE_API_KEY` and `LATE_IG_ACCOUNT_ID`.

### 5. Set up Telegram

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the token to `TELEGRAM_BOT_TOKEN`
2. Add the bot as admin to your channel
3. Get your channel ID using [@JsonDumpBot](https://t.me/JsonDumpBot) (forward a channel post to it) and set `TELEGRAM_CHANNEL_ID`

### 6. Deploy

```bash
# Deploy Chromium layer for image generation
npm run deploy:chromium

# Deploy the application
npm run deploy
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Core (Required)

| Variable | Description |
|----------|-------------|
| `DYNAMODB_TABLE` | DynamoDB table name |
| `IRANCRYPTO_API_KEY` | IranCrypto Market API key |

### AI (At least one provider key required)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_MODEL` | `gpt-4o-mini` | Model name for all AI generation |
| `AI_PROVIDER` | *(auto-detect)* | Primary provider: `openai`, `openrouter`, `deepseek`, `groq`, `together` |
| `OPENAI_API_KEY` | | OpenAI API key |
| `OPENAI_ORGANIZATION` | | OpenAI organization ID (optional) |
| `OPENROUTER_API_KEY` | | OpenRouter API key |
| `DEEPSEEK_API_KEY` | | DeepSeek API key |
| `GROQ_API_KEY` | | Groq API key |
| `TOGETHER_API_KEY` | | Together AI API key |

If `AI_PROVIDER` is not set, the system auto-selects the best available provider (priority: OpenAI > OpenRouter > DeepSeek > Groq > Together).

### Twitter

| Variable | Description |
|----------|-------------|
| `TWITTER_ACCESS_TOKEN` | OAuth2 access token (generated via `npm run auth:twitter`) |
| `TWITTER_REFRESH_TOKEN` | OAuth2 refresh token (generated via `npm run auth:twitter`) |
| `TWITTER_CLIENT_ID` | Twitter app client ID |
| `TWITTER_CLIENT_SECRET` | Twitter app client secret |
| `TWITTER_CALLBACK_URL` | OAuth2 callback URL (must match your Twitter app config) |

### Instagram

| Variable | Default | Description |
|----------|---------|-------------|
| `INSTAGRAM_PROVIDER` | `ayrshare` | Provider to use: `ayrshare` or `late` |
| `AYRSHARE_API_KEY` | | Ayrshare API key (required when provider is `ayrshare`) |
| `LATE_API_KEY` | | Late API key (required when provider is `late`) |
| `LATE_IG_ACCOUNT_ID` | | Late Instagram account ID (required when provider is `late`) |

### Telegram

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `TELEGRAM_CHANNEL_ID` | Target channel ID (numeric, e.g. `-1001234567890`) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `SCHEDULE_TIMEZONE` | `Asia/Tehran` | Timezone for post scheduling |
| `SENTRY_DSN` | | Sentry DSN for error tracking |

### Auto-managed (do not set manually)

| Variable | Description |
|----------|-------------|
| `CHROMIUM_LAYER_ARN` | Chromium Lambda layer ARN (set by `deploy:chromium` script) |
| `CHROMIUM_LAYER_ARN_ARM64` | Chromium ARM64 layer ARN (set by `deploy:chromium` script) |
| `CHROMIUM_VERSION` | Deployed Chromium version (set by `deploy:chromium` script) |

## Chromium Layer Deployment

The project automatically deploys Chromium layers for Puppeteer with version auto-detection:

```bash
# Auto-detect and deploy compatible Chromium version
npm run deploy:chromium

# With a specific AWS profile
npm run deploy:chromium:davod

# Force a specific Chromium version
./scripts/deploy-chromium-layer.sh --chromium 143.0.0

# Custom profile and region
./scripts/deploy-chromium-layer.sh --profile production --region us-east-1
```

The script auto-detects your Puppeteer version, fetches the compatible Chromium build, deploys both x64 and arm64 layers, cleans up S3 artifacts, and updates your `.env` with the layer ARNs.

## Serverless Deployment

Environment variables are set **per Lambda function** in `serverless.yml`:

- **scheduler-midnight** — Only needs IranCrypto API, DynamoDB, and scheduling config
- **poster** — Needs all variables (AI, Twitter, Instagram, Telegram, etc.)

### Local Deployment

The Serverless Framework loads variables from `.env` via `useDotenv: true`. Missing optional variables default to empty strings and won't cause failures.

### CI/CD Deployment (GitHub Actions)

Pushing to `main` triggers the CI/CD pipeline in `.github/workflows/deploy.yml`. Since `.env` is not committed, all environment variables must be configured in **GitHub Settings > Secrets and variables > Actions**, under the `production` environment.

Set `SENTRY_DSN` to enable Sentry error tracking across scheduler and poster workers.

**Secrets** (sensitive values):

`IRANCRYPTO_API_KEY`, `OPENAI_API_KEY`, `OPENAI_ORGANIZATION`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `TWITTER_ACCESS_TOKEN`, `TWITTER_REFRESH_TOKEN`, `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `AYRSHARE_API_KEY`, `LATE_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `SENTRY_DSN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

**Variables** (non-sensitive config):

`DYNAMODB_TABLE`, `CHROMIUM_LAYER_ARN`, `AI_MODEL`, `AI_PROVIDER`, `TWITTER_CALLBACK_URL`, `INSTAGRAM_PROVIDER`, `LATE_IG_ACCOUNT_ID`

## Testing

### Unit Tests

```bash
npm test
```

### Functional Tests

Tests AI generation, API connectivity, and image creation without posting to social media:

```bash
npm run test:functional

# Or run specific test suites:
node -r dotenv/config test.js caption   # AI caption generation
node -r dotenv/config test.js api       # API endpoints
node -r dotenv/config test.js image     # Image generation
node -r dotenv/config test.js all       # Everything
node -r dotenv/config test.js help      # Show help
```

## Prerequisites

- **Node.js** >= 20.x (recommended: 22.x LTS)
- **Serverless Framework** 4.x (`npm install -g serverless@latest`)
- **AWS CLI** configured with Lambda/DynamoDB/S3 permissions

## Contributing

Pull requests are welcome! Feel free to open issues for improvements or bugs.

## License

[MIT License](https://opensource.org/licenses/MIT)
