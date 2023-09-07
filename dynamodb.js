/**
 * This helper is created to use dynamo db with lambda function
 * With aim of checking duplicity:
 * Getting last run time and check what type of tweet was it
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  PutCommand,
  DynamoDBDocumentClient,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

//Define DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "eu-west-1",
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Fetch latest run timestamp from DynamoDB
 * @returns {object}
 */
async function getLastRunTime() {
  //Send Request
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          id: "last-run",
        },
      })
    );
    return result.Item ?? false;
  } catch (error) {
    console.error("Error fetching data from DynamoDB:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

/**
 * Update last run time with current timestamp
 * @param {*} time
 */
async function updateLastRunTime($subject) {
  //Send Request
  try {
    return await docClient.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          id: "last-run",
          timestamp: Date.now(),
          actionSubject: $subject,
        },
      })
    );
  } catch (error) {
    console.error("Error putting data to DynamoDB:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

async function getTwitter() {
  //Send Requests
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          id: "twitter",
        },
      })
    );
    return result.Item ?? false;
  } catch (error) {
    console.error("Error fetching data from DynamoDB:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

async function updateTwitter($data) {
  //Send Request
  try {
    return await docClient.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          ...$data,
          id: "twitter",
          timestamp: Date.now(),
        },
      })
    );
  } catch (error) {
    console.error("Error putting data to DynamoDB:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

module.exports = {
  getLastRunTime,
  updateLastRunTime,
  getTwitter,
  updateTwitter,
};
