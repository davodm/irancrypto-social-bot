/**
 * This helper is created to use dynamo db with lambda function
 * With aim of checking duplicity:
 * Getting last run time and check what type of tweet was it
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  DynamoDBDocumentClient,
  GetCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { getENV } from "./env.js";

//Define DynamoDB client
const client = new DynamoDBClient({
  region: getENV("AWS_REGION", "eu-west-1"),
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Fetch twitter data from DynamoDB
 * @returns {object}
 */
export async function getTwitter() {
  //Send Requests
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: getENV("DYNAMODB_TABLE"),
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

/**
 * Update Twitter data on DynamoDB
 * @param {object} $data
 * @returns
 */
export async function updateTwitter($data) {
  //Send Request
  try {
    return await docClient.send(
      new PutCommand({
        TableName: getENV("DYNAMODB_TABLE"),
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

/**
 * Fetch Instagram data from DynamoDB
 * @returns {object}
 */
export async function getInstagram() {
  //Send Requests
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: getENV("DYNAMODB_TABLE"),
        Key: {
          id: "instagram",
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
 * Update Instagram data on DynamoDB
 * @param {object} $data
 * @returns {Promise<}
 */
export async function updateInstagram($data) {
  //Send Request
  try {
    return await docClient.send(
      new PutCommand({
        TableName: getENV("DYNAMODB_TABLE"),
        Item: {
          ...$data,
          id: "instagram",
          timestamp: Date.now(),
        },
      })
    );
  } catch (error) {
    console.error("Error putting data to DynamoDB:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

/**
 * Schedule a post with a specified timestamp
 * @param {string} platform "twitter", "instagram", etc.
 * @param {object} data Data to be posted
 * @param {number} timestamp Unix timestamp when the post should be made
 */
export async function schedulePost(platform, target, data, timestamp) {
  try {
    // Convert large numbers to strings in the data object
    const processedData = convertLargeNumbersToString(data);

    return await docClient.send(
      new PutCommand({
        TableName: getENV("DYNAMODB_TABLE"),
        Item: {
          id: `post-${platform}-${target}`,
          platform: platform,
          target: target,
          data: processedData,
          timestamp: timestamp,
        },
      })
    );
  } catch (error) {
    console.error("Error scheduling post to DynamoDB:", error);
    throw error;
  }
}

/**
 * Fetch scheduled posts from DynamoDB
 * @returns {object}
 */
export async function getScheduledPosts() {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: getENV("DYNAMODB_TABLE"),
        FilterExpression: 'attribute_exists(#ts) AND #ts <= :now',
        ExpressionAttributeNames: {
          '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
          ":now": Math.floor(Date.now() / 1000), // Convert current time to Unix timestamp in seconds
        },
      })
    );
    return result.Items ?? [];
  } catch (error) {
    console.error("Error fetching scheduled posts from DynamoDB:", error);
    throw error;
  }
}

/**
 * Remove a scheduled post from DynamoDB
 * @param {string} platform
 * @param {string} target
 */
export async function removeScheduledPost(platform, target) {
  try {
    return await docClient.send(
      new DeleteCommand({
        TableName: getENV("DYNAMODB_TABLE"),
        Key: {
          id: `post-${platform}-${target}`,
        },
      })
    );
  } catch (error) {
    console.error("Error removing scheduled post from DynamoDB:", error);
    throw error;
  }
}

function convertLargeNumbersToString(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertLargeNumbersToString);
  }

  return Object.keys(obj).reduce((acc, key) => {
    if (typeof obj[key] === "number" && obj[key] > Number.MAX_SAFE_INTEGER) {
      acc[key] = obj[key].toString();
    } else if (typeof obj[key] === "object") {
      acc[key] = convertLargeNumbersToString(obj[key]);
    } else {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}
