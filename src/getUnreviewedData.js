const AWS = require('aws-sdk');
const fs = require('fs');
const parser = require('json2csv').Parser;
const { USER_UPLOADS_TABLE_NAME, REVIEWED_UPLOADS_TABLE_NAME, REGION } = require('./shared/consts.js');
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: REGION });
let converter = require('json-2-csv');
const Logger = require('node-json-logger');
const logger = new Logger();

// This function takes in the table name of the table and returns all of the records in that table
// Currently this is done through a scan, but potentially could be a query in the future to be more efficient.

async function loadDynamoData(tableName) {
  var results = []
  var currentResults = await loadAdditionalResults(tableName)
  results = results.concat(currentResults.Items)
  while (currentResults.LastEvaluatedKey) {
    currentResults = await loadAdditionalResults(tableName, currentResults.LastEvaluatedKey)
    results = results.concat(currentResults.Items)
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
  }
  if (start) {
    params.ExclusiveStartKey = start
  }

  return new Promise((resolve, reject) => {
    dynamoDb.scan(params, (error, result) => {
      if (error) {
        logger.error('Error scanning dynamodb', {params: params})
        reject(error)
      } else if (result) {
        resolve(result)
      } else {
        reject("Unknown error")
      }
    })
  })
}

// Main Script takes in no arguments and returns a CSV file of all of the data in the user-uploads that isn't in reviewed-uploads
async function main() {
  const unReviewed = await loadDynamoData(USER_UPLOADS_TABLE_NAME);
  const reviewed = await loadDynamoData(REVIEWED_UPLOADS_TABLE_NAME);
  return unReviewed.filter(({ id: id1 }) => !reviewed.some(({ id: id2 }) => id2 === id1));
}

module.exports = {
  main
}
