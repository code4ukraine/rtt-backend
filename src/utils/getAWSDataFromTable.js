const AWS = require('aws-sdk');
const { REGION } = require('../shared/consts.js');
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: REGION });
const Logger = require('node-json-logger');
const logger = new Logger();

// This function takes in the table name of the table and returns all of the records in that table
// Currently this is done through a scan, but potentially could be a query in the future to be more efficient.

async function loadDynamoData(tableName) {
  var results = [];
  var currentResults = await loadAdditionalResults(tableName);
  results = results.concat(currentResults.Items);
  while (currentResults.LastEvaluatedKey) {
    currentResults = await loadAdditionalResults(tableName, currentResults.LastEvaluatedKey);
    results = results.concat(currentResults.Items);
  }
  // Converts Unix timestamp to a readable date for the CSV
  results = results.map(item => {
    item.created_at = new Date(item.created_at * 1000).toLocaleString();
    return item;
  });
  return results;
}

async function loadAdditionalResults(tableName, start) {
  var params = {
    TableName: tableName,
  };
  if (start) {
    params.ExclusiveStartKey = start;
  }

  return new Promise((resolve, reject) => {
    dynamoDb.scan(params, (error, result) => {
      if (error) {
        logger.error('Failed to scan dynamo table', {
          error: error,
          params: params,
        });
        reject(error);
      } else if (result) {
        resolve(result);
      } else {
        reject("Unknown error");
      }
    })
  })
}

module.exports = {
  loadDynamoData,
}
