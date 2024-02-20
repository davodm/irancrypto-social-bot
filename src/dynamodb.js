/**
 * This helper is created to use dynamo db with lambda function
 * With aim of checking duplicity:
 * Getting last run time and check what type of tweet was it
 */

import  { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

//Define DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "eu-west-1",
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Fetch latest run timestamp from DynamoDB
 * @param {string} $type type of action
 * @returns {object}
 */
export async function getLastRunTime($type) {
  //Send Request
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          id: `last-run-${$type}`,
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
 * @param {string} $type type of action
 * @param {object} $data data object to save
 */
export async function updateLastRunTime($type,$data={}) {
  //Send Request
  try {
    return await docClient.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          id: `last-run-${$type}`,
          timestamp: Date.now(),
          ...$data
        },
      })
    );
  } catch (error) {
    console.error("Error putting data to DynamoDB:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

/**
 * Fetch twitter data from DynamoDB
 * @returns {object}
 */
export async function getTwitter() {
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


/**
 * Fetch Instagram data from DynamoDB
 * @returns {object}
 */
export async function getInstagram() {
  //Send Requests
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE,
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
 * @returns 
 */
export async function updateInstagram($data) {
  //Send Request
  try {
    return await docClient.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_TABLE,
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