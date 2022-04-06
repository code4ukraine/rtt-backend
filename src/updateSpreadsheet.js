// Get spreadsheet npm package
const { GoogleSpreadsheet } = require('google-spreadsheet');
const getNewData = require('./getUnreviewedData.js');
const uploadReviewed = require('./uploadReviewedData.js');
const Logger = require('node-json-logger');
const logger = new Logger();
const metrics = require('./metrics.js');

// Google sheet + secret configuration
const AWS = require('aws-sdk');
const process = require('process');
const googleSheetID = process.env.GOOGLE_SHEET_ID;
const clientSecret_arn = process.env.GOOGLE_SECRETS_ARN;

// Instantiates the spreadsheet
const sheet = new GoogleSpreadsheet(googleSheetID);

async function getClientSecret() {
  var data;
  const client = new AWS.SecretsManager();
  try {
    data = await client.getSecretValue({SecretId: clientSecret_arn}).promise();
  } catch (err) {
    throw err;
  }

  return JSON.parse(data.SecretString);
}

function cleanData(data) {
  return {
    event_type: data['event_type'],
    photo_location: data['photo_location'],
    photo: data['photo'],
    location: {
      description: data['location.description'],
      lat: data['location.lat'],
      lon: data['location.lon']
    },
    created_at: data['created_at'],
    status: data['status'],
    timeStamp: data['timeStamp'],
    source: data['source'],
    description: data['description'],
    id: data['id'],
    sightings: data['sightings'],
    photo_location: {
      lat: data['photo_location.lat'],
      lon: data['photo_location.lon']
    },
    userTimeStamp: data['userTimeStamp']
  }
}

async function getAWSData() {
  const newData = await getNewData.main();

  const cleanData = newData.map(function(item) {
    return {
      event_type: item.event_type,
      photo_location: JSON.stringify(item.photo_location),
      photo: item.photo,
      "location.description": item.location.description,
      "location.lat": item.location.lat,
      "location.lon": item.location.lon,
      created_at: item.created_at,
      status: item.status,
      timeStamp: item.timeStamp,
      source: item.source,
      description: item.description,
      id: item.id,
      sightings: JSON.stringify(item.sightings),
      userTimeStamp: item.userTimeStamp
    }
  });
  return cleanData;
}

// Asynchronously get the data
async function insertRow(data) {

  // Get the first tab's data
  const tab = sheet.sheetsByIndex[0];

  //for each item in data append it
  try {
    await tab.addRows(data);
  } catch(err) {
    logger.error('Failed to add rows to spreadsheet', {
      data: data,
      error: err,
      sheet_id: googleSheetID,
    });

    throw err;
  }
}

async function getData() {
  try {
      // Get the first tab's data
      const tab = sheet.sheetsByIndex[0];

      // Get row data
      const rows = await tab.getRows();

      // Empty array for our data
      let data = [];
      // If we have data
      if (rows.length > 0) {
          // Iterate through the array of rows
          // and push the clean data from your spreadsheet
          rows.forEach(row => {
            data.push(cleanData(row));
          });
      } else {
          return false;
      }
      // Return the data JSON encoded
      return data;
  } catch(err) {
      logger.error('Failed to get rows from spreadsheet', {
        error: err,
        sheet_id: googleSheetID,
      });

      throw err;
  }
}

async function updateSpreadsheet() {
  // fetch client secret from secretsmanager
  var clientSecret;
  try {
    clientSecret = await getClientSecret();
  } catch (err) {
    logger.error('Unable to fetch secret', {
      error: err,
      secret: clientSecret_arn,
    });

    throw err;
  }

  // initialize google sheet
  await sheet.useServiceAccountAuth(clientSecret);
  await sheet.loadInfo();

  const sheetData = await getData(clientSecret);
  const AWSData = await getAWSData();
  var addedCount;

  if (sheetData.length === 0) {
    insertRow(AWSData);
    addedCount = AWSData.length;
  } else {
    // get items in AWSData that are not in sheetData based on id
    const newData = AWSData.filter(function(item) {
      return !sheetData.some(function(item2) {
        return item2.id === item.id;
      });
    });
    insertRow(newData);
    addedCount = newData.length;

    await uploadReviewed.processFile(sheetData);
  }

  // update metrics
  logger.info('Updated sheet', {
    'addedRows': addedCount,
    'existingRows': sheetData.length,
    'sheetSize': sheetData.length + addedCount,
    'unreviewedUploads': AWSData.length,
  });

  metrics.put('sheetSize', 'Count', sheetData.length + addedCount);
  metrics.put('unreviewedUploads', 'Count', AWSData.length);
}

module.exports = {
   updateSpreadsheet
}
