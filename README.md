# IranCrypto Market Twitter Bot

This project consists of a Node.js based AWS Lambda function and CLI helper tool to automatically tweet daily crypto market updates for Iran using data from the IranCrypto API.

The Lambda function fetches the most popular cryptocurrencies each day using the IranCrypto market data API. It then uses this data to generate an insightful tweet thread discussing the top performing cryptos and their volume/price changes.

The tweet content itself is generated using ChatGPT to create relevant messages in English based on the latest market data. These messages are then populated with actual values and posted via the Twitter API using credentials obtained with the CLI helper.

### Features
* Fetches daily ranking of top cryptos from IranCrypto API
* Uses ChatGPT to create engaging English language tweets
* Populates tweet templates with real values and posts to Twitter
* Runs daily via AWS Lambda on a cron schedule
* CLI tool to authenticate and obtain Twitter API credentials
* Serverless architecture using AWS Lambda for maintenance-free execution

## Setup & Usage
Twitter access token it's not a straight forward way, So you need:

1. Setup your developer portal
2. Setup a new application
3. Setup an user authentication setup for your project (Callback URL could be anything, we just need to copy it after redirection)

4. Then it's time to set your enviornment variables:
```sh
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_KEY=<Your API Key>
OPENAI_ORGANIZATION=<Your Organization API Key>
DYNAMODB_TABLE=<Your Dynamo DB table name>
IRANCRYPTO_API_KEY=<Your API Key on IranCrypto>

TWITTER_ACCESS_TOKEN=<Your twitter access token that you wont have it first>
TWITTER_REFRESH_TOKEN=<Your twitter refresh token that you wont have it first>

TWITTER_CLIENT_ID=<Your Twitter application client ID>
TWITTER_CLIENT_SECRET=<Your Twitter application client Secret>

CALLBACK_URL=https://randomurl/twitterbot/ //Should be the same with your Twitter app config
```

5. In order to authenticate and configure Twitter credentials, use the helper cli tool:
```sh
$ npm run twitter
> Save Code verifierer below ->

<....>

Go to this link to auth your account ->

<https://twitter.com/i/oauth2/authorize?>

After all answer the prompts!
```

6. After that you will see the access & refresh tokens in the console which should be copied in your enviornment variables.

The rest will be managed by Dynamo DB to store your tokens each time it's get refreshed.

Read more [technical details](https://github.com/PLhery/node-twitter-api-v2/blob/712ca82293c1b587638055537969dbec5a7bce40/doc/auth.md#user-wide-authentication-flow)  on the Twitter authentication flow used.

## Installation
1. Clone Repo
2. Run `npm install`
3. Create .env file and fill out the values as explained
4. Deploy lambda function through [serverless](https://www.serverless.com/framework/docs/providers/aws/guide/deploying): `npm run deploy`

Whole serverless configuration will create DynamoDB table, attach the needed permissions and set the cronjob.

## Contributing
Pull requests are welcome! Feel free to open issues for any improvements or bugs.

## License
This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).