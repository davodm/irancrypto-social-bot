# IranCrypto Market Social Media Bot

The IranCrypto Market Social Media Bot is a powerful project that leverages Node.js and AWS Lambda to automate the generation of daily/weekly crypto market updates on social media platforms, including Twitter, Telegram and Instagram. It utilizes the IranCrypto API to fetch data on the most popular cryptocurrencies and then generates insightful content, complete with engaging English-language tweets and Instagram posts.

### Features
* **Crypto Market Data:** Fetches daily and weekly rankings of top cryptocurrencies from the [IranCryptoMarket API](https://irancrypto.market/api/).
* **Engaging Content Generation:** Uses AI models (OpenAI GPT or OpenRouter alternatives) to create compelling English-language tweets that discuss the performance, volume, and price changes of the top cryptocurrencies.
* **Instagram Image Creation:** Generates images for Instagram posts using [Puppeteer+Chromium](https://github.com/puppeteer/puppeteer), based on [Chromium for serverless](https://github.com/Sparticuz/chromium) which needs to be uploaded as a layer on AWS Lambda ([Guide](https://github.com/Sparticuz/chromium/tree/master/examples/serverless-with-preexisting-lambda-layer)) and also match with the version of puppeteer [Related Doc](https://pptr.dev/supported-browsers).
* **Twitter Integration:** Posts generated content on Twitter using the [Twitter API V2](https://www.npmjs.com/package/twitter-api-v2), with credentials obtained using a CLI tool.
* **Instagram Posting:** Shares the generated images as both posts and stories on Instagram, utilizing the [Instagram private API](https://www.npmjs.com/package/instagram-private-api).
* **Telegram Posting:** Shares the generated images on Telegram channel, utilizing the [Node.JS Telegram Bot API](https://www.npmjs.com/package/node-telegram-bot-api).
* **Serverless Execution:** Runs daily via AWS Lambda on a cron schedule, ensuring maintenance-free execution and scalability.
* **AyreShare API:** In case of Instagram blockage, the project uses the [AyreShare API](https://www.ayrshare.com/) to bypass the checkpoint, you can set the API key on .env file to use it optionally.
* **AI Provider Fallback:** Intelligent fallback system between OpenAI and OpenRouter APIs for reliable AI content generation.


## Flow
- **Fetch Data**: Fetches data from the API at 23:59 Iran time (20:29 UTC).
- **Schedule Posts**: Schedules posts for different social media platforms (Twitter, Instagram, Telegram) at specified times.
- **Post Data**: Posts the scheduled data at the specified times with hourly poster cronjob.
- **Supports Daily, Weekly, and Monthly Recaps**: Handles daily recaps, weekly recaps every Friday, and monthly recaps on the last day of the month.


## Setup & Usage
Twitter access token it's not a straight forward way, But for the rest of the modules, you just need to use the credientials on .env file.

1. **Developer Portal Setup:** Begin by setting up your developer portal on Twitter.
2. **Application Creation:** Create a new application within your developer portal.
3. **User Authentication Setup:** Set up user authentication for your project, including specifying a callback URL. (Callback URL could be anything, we just need to copy it after redirection)
4. **Environment Variables:** Configure your environment variables by adding them to the .env file. These variables include API keys, access tokens, and credentials for Twitter, Instagram, and AI services.

```sh
# AI Configuration (OpenAI or OpenRouter)
OPENAI_MODEL=gpt-4o-mini  # or any model like openai/gpt-oss-20b:free
OPENAI_API_KEY=<Your OpenAI API Key>  # Optional: Primary AI provider
OPENAI_ORGANIZATION=<Your OpenAI Organization ID>  # Optional: For OpenAI
OPENROUTER_API_KEY=<Your OpenRouter API Key>  # Optional: Fallback AI provider
DYNAMODB_TABLE=<Your Dynamo DB table name>
IRANCRYPTO_API_KEY=<Your API Key on IranCrypto>

TWITTER_ACCESS_TOKEN=<Your twitter access token that you wont have it first>
TWITTER_REFRESH_TOKEN=<Your twitter refresh token that you wont have it first>

TWITTER_CLIENT_ID=<Your Twitter application client ID>
TWITTER_CLIENT_SECRET=<Your Twitter application client Secret>

TWITTER_CALLBACK_URL=https://randomurl/twitterbot/ //Should be the same with your Twitter app config

IG_USERNAME=<Your Instagram username>
IG_PASSWORD=<Your Instagram password>
IG_PROXY=<Your server proxy to use Instagram>
IG_PRELOGIN=false //If you want to use prelogin simulation, set it to true
IG_STORE_SESSION=true //If you want to store session on DynamoDB, set it to true

TELEGRAM_CHANNEL_ID=<Your Telegram channel ID in number>
TELEGRAM_BOT_TOKEN=<Your Telegram bot token>

CHROMIUM=<Your chromium path if you want to set it manually without AWS layers>

AYRESHARE_API_KEY=<Your Ayreshre API Key - optionally>

SCHEDULE_TIMEZONE=Asia/Tehran
```

**AI Provider Configuration:**
- **OpenAI (Primary)**: Set `OPENAI_API_KEY` and optionally `OPENAI_ORGANIZATION`
- **OpenRouter (Fallback)**: Set `OPENROUTER_API_KEY` for alternative AI models
- **Model Selection**: Use `OPENAI_MODEL` to specify any supported model (e.g., `gpt-4o-mini`, `openai/gpt-oss-20b:free`)
- **Automatic Fallback**: If OpenAI fails, the system automatically switches to OpenRouter
```

5. **Twitter Authentication:** Use the provided CLI tool to authenticate and configure Twitter credentials. This tool will guide you through the authentication process and generate access and refresh tokens.

```sh
$ npm run twitter-auth
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
$ npm run instagram-auth
```

8. **Telegram Channel ID:** You can use [JSONDump Bot](https://t.me/JsonDumpBot) by forwarding a post from your channel to the bot to identify the channel id.

## Prerequisites
- **Node.js**: Version 22.x or higher (recommended: 22.x LTS)
- **Serverless Framework**: Version 4.x (install globally: `npm install -g serverless@latest`)
- **AWS CLI**: Configured with appropriate credentials

## Installation
1. Clone Repo
2. Run `npm install`
3. **Install Serverless Framework globally**: `npm install -g serverless@latest`
4. Create .env file and fill out the values as explained
5. **Test your AI configuration**: Run `npm test` to verify everything works
6. Deploy lambda function through [serverless](https://www.serverless.com/framework/docs/providers/aws/guide/deploying): `npm run deploy`

Whole serverless configuration will create DynamoDB table, attach the needed permissions and set the cronjob.

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

- **AI Provider Fallback**: Implemented intelligent fallback between OpenAI and OpenRouter APIs
- **Comprehensive Testing**: Full test suite with Node.js built-in test runner (17/17 tests passing)
- **Production Ready**: Lightweight, production-ready AI helper with graceful error handling
- **Environment Management**: Proper .env loading and configuration management
## Contributing
Pull requests are welcome! Feel free to open issues for any improvements or bugs.

## License
This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).