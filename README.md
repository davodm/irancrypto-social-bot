# IranCrypto Market Social Media Bot

The IranCrypto Market Social Media Bot is a powerful project that leverages Node.js and AWS Lambda to automate the generation of daily/weekly crypto market updates on social media platforms, including Twitter, Telegram and Instagram. It utilizes the IranCrypto API to fetch data on the most popular cryptocurrencies and then generates insightful content, complete with engaging English-language tweets and Instagram posts.

### Features
* **Crypto Market Data:** Fetches daily and weekly rankings of top cryptocurrencies from the [IranCryptoMarket API](https://irancrypto.market/api/).
* **Engaging Content Generation:** Uses AI models (OpenAI GPT or OpenRouter alternatives) to create compelling English-language tweets that discuss the performance, volume, and price changes of the top cryptocurrencies.
* **Instagram Image Creation:** Generates images for Instagram posts using [Puppeteer+Chromium](https://github.com/puppeteer/puppeteer), with automated Chromium layer deployment for AWS Lambda.
* **Twitter Integration:** Posts generated content on Twitter using the [Twitter API V2](https://www.npmjs.com/package/twitter-api-v2), with credentials obtained using a CLI tool.
* **Instagram Posting:** Shares the generated images as both posts and stories on Instagram, utilizing the [Instagram private API](https://www.npmjs.com/package/instagram-private-api).
* **Telegram Posting:** Shares the generated images on Telegram channel, utilizing the [Node.JS Telegram Bot API](https://www.npmjs.com/package/node-telegram-bot-api).
* **Serverless Execution:** Runs daily via AWS Lambda on a cron schedule, ensuring maintenance-free execution and scalability.
* **AyreShare API:** In case of Instagram blockage, the project uses the [AyreShare API](https://www.ayrshare.com/) to bypass the checkpoint, you can set the API key on .env file to use it optionally.
* **AI Provider Fallback:** Intelligent fallback system between OpenAI and OpenRouter APIs for reliable AI content generation.
* **Error Tracking:** Integrated Sentry error tracking for monitoring and debugging production issues.


## Flow
- **Fetch Data**: Fetches data from the API at 23:59 Iran time (20:29 UTC).
- **Schedule Posts**: Schedules posts for different social media platforms (Twitter, Instagram, Telegram) at specified times.
- **Post Data**: Posts the scheduled data at the specified times with hourly poster cronjob.
- **Supports Daily, Weekly, and Monthly Recaps**: Handles daily recaps, weekly recaps every Friday, and monthly recaps on the last day of the month.


## Quick Setup & Deployment

### Step 1: Initial Setup
1. **Clone and Install**: `git clone <repo> && cd irancrypto-twitter-bot && npm install`
2. **Configure Environment**: Copy `.env` file and fill in your API keys and credentials
3. **Deploy Chromium**: `npm run deploy:chromium` (auto-deploys compatible Chromium layers)
4. **Deploy Application**: `npm run deploy` (deploys to AWS Lambda)

### Step 2: Authentication Setup
Twitter access token setup (not straightforward):
1. **Developer Portal Setup:** Set up your developer portal on Twitter
2. **Application Creation:** Create a new application within your developer portal
3. **User Authentication Setup:** Set up user authentication with a callback URL
4. **Twitter Auth CLI:** Run `npm run auth:twitter` to authenticate and generate tokens

Instagram checkpoint bypass (if needed): `npm run auth:instagram`

### Step 3: Environment Variables
Configure your environment variables in `.env`. Required variables include API keys, access tokens, and credentials for Twitter, Instagram, Telegram, and AI services.

```sh
# ============================================
# REQUIRED - Core Configuration
# ============================================
DYNAMODB_TABLE=<Your Dynamo DB table name>
IRANCRYPTO_API_KEY=<Your API Key on IranCrypto>

# ============================================
# AI Configuration (REQUIRED: At least one provider API key)
# ============================================
AI_MODEL=gpt-4o-mini  # Optional: Model for all AI services (default: gpt-4o-mini)
AI_PROVIDER=openai  # Optional: Primary provider (openai, openrouter, deepseek, groq, together)

# Set at least ONE of the following AI provider API keys:
OPENAI_API_KEY=<Your OpenAI API Key>  # Optional: Primary provider
OPENAI_ORGANIZATION=<Your OpenAI Organization ID>  # Optional: Only for OpenAI
OPENROUTER_API_KEY=<Your OpenRouter API Key>  # Optional: Alternative provider
DEEPSEEK_API_KEY=<Your DeepSeek API Key>  # Optional: Additional provider
GROQ_API_KEY=<Your Groq API Key>  # Optional: Additional provider
TOGETHER_API_KEY=<Your Together AI API Key>  # Optional: Additional provider

# ============================================
# Twitter Configuration (REQUIRED for Twitter posting)
# ============================================
TWITTER_ACCESS_TOKEN=<Your twitter access token that you wont have it first>
TWITTER_REFRESH_TOKEN=<Your twitter refresh token that you wont have it first>
TWITTER_CLIENT_ID=<Your Twitter application client ID>
TWITTER_CLIENT_SECRET=<Your Twitter application client Secret>
TWITTER_CALLBACK_URL=https://randomurl/twitterbot/  # Should match your Twitter app config

# ============================================
# Instagram Configuration (REQUIRED for Instagram posting)
# ============================================
IG_USERNAME=<Your Instagram username>
IG_PASSWORD=<Your Instagram password>
IG_PROXY=<Your server proxy to use Instagram>  # Optional
IG_PRELOGIN=false  # Optional: Set to true for prelogin simulation
IG_STORE_SESSION=true  # Optional: Set to false to disable DynamoDB session storage
AYRESHARE_API_KEY=<Your Ayreshare API Key>  # Optional: For bypassing Instagram checkpoints

# ============================================
# Telegram Configuration (REQUIRED for Telegram posting)
# ============================================
TELEGRAM_BOT_TOKEN=<Your Telegram bot token>
TELEGRAM_CHANNEL_ID=<Your Telegram channel ID in number>

# ============================================
# Optional Configuration
# ============================================
SCHEDULE_TIMEZONE=Asia/Tehran  # Optional: Default timezone for scheduling (default: Asia/Tehran)
SENTRY_DNS=<Your Sentry DSN>  # Optional: Sentry DSN for error tracking (leave empty to disable)

# ============================================
# Auto-managed by Chromium deployment script
# ============================================
CHROMIUM_LAYER_ARN=<Auto-generated by deploy:chromium>
CHROMIUM_LAYER_ARN_ARM64=<Auto-generated by deploy:chromium>
CHROMIUM_VERSION=<Auto-generated by deploy:chromium>
```

**AI Provider Configuration:**
- **OpenAI (Primary)**: Set `OPENAI_API_KEY` and optionally `OPENAI_ORGANIZATION`
- **OpenRouter (Fallback)**: Set `OPENROUTER_API_KEY` for alternative AI models
- **DeepSeek**: Set `DEEPSEEK_API_KEY` for DeepSeek models
- **Groq**: Set `GROQ_API_KEY` for Groq models
- **Together AI**: Set `TOGETHER_API_KEY` for Together AI models
- **Configuration**:
  - `AI_MODEL`: Single model used for all AI services (tweets, captions, etc.)
  - `AI_PROVIDER`: Specify primary provider (openai, openrouter, deepseek, groq, together) - requires corresponding API key
- **Automatic Fallback**: If primary provider fails or isn't set, automatically selects the best available provider (priority: specified primary > OpenAI > OpenRouter > DeepSeek > Groq > Together)
```

5. **Twitter Authentication:** Use the provided CLI tool to authenticate and configure Twitter credentials. This tool will guide you through the authentication process and generate access and refresh tokens.

```sh
$ npm run auth:twitter
> Save Code verifierer below ->

<....>

Go to this link to auth your account ->

<https://twitter.com/i/oauth2/authorize?>

After all answer the prompts!
```

6. **Token Storage:** The project uses DynamoDB to store and manage your Twitter tokens, ensuring that they are refreshed as needed.

Read more [technical details](https://github.com/PLhery/node-twitter-api-v2/blob/712ca82293c1b587638055537969dbec5a7bce40/doc/auth.md#user-wide-authentication-flow)  on the Twitter authentication flow used.

7. **Instagram Checkpoint Bypass:** In case of Instagram blockage, you can use the CLI tool to bypass the checkpoint.

```sh
$ npm run auth:instagram
```

8. **Telegram Channel ID:** You can use [JSONDump Bot](https://t.me/JsonDumpBot) by forwarding a post from your channel to the bot to identify the channel id.

## Prerequisites
- **Node.js**: Version 22.x or higher (recommended: 22.x LTS)
- **Serverless Framework**: Version 4.x (install globally: `npm install -g serverless@latest`)
- **AWS CLI**: Configured with appropriate credentials and permissions for Lambda layer deployment

## Installation
1. Clone Repo
2. Run `npm install`
3. **Install Serverless Framework globally**: `npm install -g serverless@latest`
4. Create .env file and fill out the values as explained
5. **Deploy Chromium Layer**: Run `npm run deploy:chromium` (or `npm run deploy:chromium:davod` for specific profile)
6. **Test your AI configuration**: Run `npm test` to verify everything works
7. Deploy lambda function through [serverless](https://www.serverless.com/framework/docs/providers/aws/guide/deploying): `npm run deploy`

Whole serverless configuration will create DynamoDB table, attach the needed permissions and set the cronjob.

## Automated Chromium Layer Deployment

The project automatically deploys Chromium layers for Puppeteer using an intelligent version matching system:

### Quick Setup
```bash
# Auto-detect and deploy compatible Chromium version
npm run deploy:chromium

# Or for specific AWS profile
npm run deploy:chromium:davod
```

### What It Does
- **Auto-detection**: Detects your installed Puppeteer version and finds the compatible Chromium version
- **Web-first lookup**: First tries to fetch version mapping from [pptr.dev/supported-browsers](https://pptr.dev/supported-browsers)
- **Fallback mapping**: Uses hardcoded compatibility mapping if web lookup fails
- **Multi-architecture**: Deploys both x64 and arm64 layers automatically
- **Cost optimization**: Cleans up S3 files after layer creation (layers are free, S3 storage is not)
- **Environment management**: Updates your `.env` file with layer ARNs

### Manual Control
```bash
# Force specific Chromium version
./scripts/deploy-chromium-layer.sh --chromium 143.0.0

# Use specific AWS profile and region
./scripts/deploy-chromium-layer.sh --profile production --region us-east-1
```

The script will automatically update your `.env` file with the deployed layer ARNs, making deployment seamless.

## Environment Variables & Serverless Deployment

**Important**: Environment variables are set **per Lambda function** in `serverless.yml`, not globally. Each function only receives the environment variables it actually needs:

- **scheduler-midnight**: IranCrypto API access, DynamoDB, and scheduling configuration
- **poster**: All environment variables (AI, Twitter, Instagram, Telegram, DynamoDB, IranCrypto API)

**Auto-managed Variables**: Chromium layer ARNs are automatically managed by the deployment script. Don't set these manually:

- `CHROMIUM_LAYER_ARN`: Chromium layer ARN (x64, auto-generated)
- `CHROMIUM_LAYER_ARN_ARM64`: Chromium ARM64 layer ARN (auto-generated)
- `CHROMIUM_VERSION`: Deployed Chromium version (auto-generated)

**Optional Variables**: The `serverless.yml` configuration uses default empty strings for optional variables, so you don't need to set all AI provider keys, Instagram proxy, or other optional settings. Only set the variables you actually need:

- **AI Providers**: Set at least one AI provider API key (OPENAI_API_KEY, OPENROUTER_API_KEY, etc.)
- **Social Media Platforms**: Only set variables for platforms you want to use (Twitter, Instagram, Telegram)
- **Optional Features**: IG_PROXY, AYRESHARE_API_KEY, etc. can be omitted if not needed
- **Error Tracking**: Set SENTRY_DNS to enable Sentry error tracking across all workers (scheduler and content processors)

The Serverless Framework will automatically load variables from `.env` during deployment and set them appropriately for each function. Missing optional variables will be set to empty strings, which won't cause deployment failures.

## Functionality
- Twitter: Share two daily tweets about total market transactions and top 3 cryptocurrencies.
- Instagram: Share a weekly post about 10 most traded cryptocurrencies and a monthly post about trading value of 10 crypto exchanges.
- Telegram: Share a daily post about 10 most traded cryptocurrencies.

### Cronjob
Cronjob is set to run specificly for each controller:
- Scheduler: 23:59 Iran time (20:29 UTC)
- Poster: Every hour

The `serverless.yml` file configures the scheduling of Lambda functions using AWS CloudWatch Events.

## Improvements and Testing

- **Automated Chromium Deployment**: Intelligent Chromium layer deployment with version auto-detection and multi-architecture support
- **AI Provider Fallback**: Implemented intelligent fallback between OpenAI and OpenRouter APIs
- **Comprehensive Testing**: Full test suite with Node.js built-in test runner (17/17 tests passing)
- **Production Ready**: Lightweight, production-ready AI helper with graceful error handling
- **Environment Management**: Proper .env loading and configuration management
- **Cost Optimization**: Automatic S3 cleanup and efficient layer management
## Contributing
Pull requests are welcome! Feel free to open issues for any improvements or bugs.

## License
This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).