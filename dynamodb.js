/**
 * This helper is created to use dynamo db with lambda function
 * With aim of checking duplicity:
 * Getting last run time and check what type of tweet was it
 */
 const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
});

/**
 * Fetch latest run timestamp from DynamoDB
 * @returns {object}
 */
async function getLastRunTime() {
  const result = await dynamodb.get({
    TableName: process.env.DYNAMODB_TABLE+'-runs', 
    Key: { 
      name: 'last-run' // Timestamp name 
    }
  }).promise();

  return result.Item ?? false;

}

/**
 * Update last run time with current timestamp
 * @param {*} time 
 */
async function updateLastRunTime($subject) {
  await dynamodb.put({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      name: 'last-run',
      timestamp: Date().now(),
      subject:$subject 
    }
  }).promise();
}

async function getTwitter(){
  const result = await dynamodb.get({
    TableName: process.env.DYNAMODB_TABLE, 
    Key: { 
      name: 'twitter'
    }
  }).promise();

  return result.Item ?? false;
}

async function updateTwitter($data){
  await dynamodb.put({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      ...$data,
      name: 'twitter',
      timestamp: Date().now(),
    }
  }).promise();
}

module.exports={
  getLastRunTime,
  updateLastRunTime,
  getTwitter,
  updateTwitter
}