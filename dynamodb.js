/**
 * This helper is created to use dynamo db with lambda function 
 * With aim of checking duplicity:
 * Getting last run time and check what type of tweet was it
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Fetch latest run timestamp from DynamoDB
 * @returns {object}
 */
async function getLastRunTime() {
  const command = new GetCommand({
    TableName: process.env.DYNAMODB_TABLE + "-runs",
    Key: {
      name: "last-run", // Timestamp name
    },
  });

  //Send Requests
  const result = await docClient.send(command);

  return result.Item ?? false;
}

/**
 * Update last run time with current timestamp
 * @param {*} time
 */
async function updateLastRunTime($subject) {
  const command = new PutCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      name: "last-run",
      timestamp: Date().now(),
      subject: $subject,
    },
  });

  //Send Request
  return await docClient.send(command);
}

async function getTwitter() {
  const command = new GetCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      name: "twitter",
    },
  });
  //Send Requests
  const result = await docClient.send(command);

  return result.Item ?? false;
}

async function updateTwitter($data) {
  const command = new PutCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      ...$data,
      name: "twitter",
      timestamp: Date().now(),
    },
  });

  //Send Request
  return await docClient.send(command);
}

module.exports = {
  getLastRunTime,
  updateLastRunTime,
  getTwitter,
  updateTwitter,
};
