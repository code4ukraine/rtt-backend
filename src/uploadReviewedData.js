const AWS = require('aws-sdk');
const { REVIEWED_UPLOADS_TABLE_NAME, REGION } = require('./shared/consts.js');
const Logger = require('node-json-logger');
const logger = new Logger();

AWS.config.update({
  region: REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

const docsOutput = (docsRemaining, successfulUploads, initialUploads, failedUploads, skippedUploads) => {
  if (docsRemaining === 0) {
    logger.info('Uploaded reviewed items', {
      success: successfulUploads,
      initial: initialUploads,
    });
  }
};

// Converts the provided csv to json and then uploads the json to the reviewed database
async function processFile(data) {
  const jsonObj = data;
  let successfulUploads = 0;
  let failedUploads = 0;
  let skippedUploads = 0;
  const initialUploads = jsonObj.length;
  let docsRemaining = jsonObj.length;
  jsonObj.forEach(function (event) {
    if (checkEvent(event)) {
      var params = {
        TableName: REVIEWED_UPLOADS_TABLE_NAME,
        Item: {
          "id": event.id.toString(),
          "created_at": parseInt(new Date(event.created_at).getTime() / 1000),
          "reviewed_at": parseInt(new Date().getTime() / 1000),
          "timeStamp": event.timeStamp,
          "description": event.description,
          "location": event.location,
          "photo": event.photo,
          "photo_location": event.photo_location,
          "latlng_confidence": event.latlng_confidence,
          "event_type": event.event_type,
          "sightings": JSON.parse(event.sightings),
          "source": event.source,
          "status": event.status,
          userTimeStamp: event.userTimeStamp
        }
      };
      docClient.put(params, function (err) {
        if (err) {
          logger.error('Failed to insert item', {
            err: err,
            params: params,
          });
          docsRemaining--;
          failedUploads++;
          docsOutput(docsRemaining, successfulUploads, initialUploads, failedUploads, skippedUploads);
        } else {
          docsRemaining--;
          successfulUploads++;
          docsOutput(docsRemaining, successfulUploads, initialUploads, failedUploads, skippedUploads);
          return;
        }
      });
    } else {
      skippedUploads++;
      docsRemaining--;
      docsOutput(docsRemaining, successfulUploads, initialUploads, failedUploads, skippedUploads);
    }
  });
}

// Runs the event through rudimentary checks and flags which (if any) are invalid
const checkEvent = function (event) {
  event.status = event.status.toLowerCase();
  if (event.status === "") {
    return false;
  } else if (isNaN(event.location.lat) || event.location.lat === "") {
    logger.error(`Event ${event.id} missing lat`, {
      event: event.id,
    });
    return false;
  } else if (isNaN(event.location.lat) || event.location.lon === "") {
    logger.error(`Event ${event.id} missing lon`, {
      event: event.id,
    });
    return false;
  } else if (event.status !== "approved" && event.status !== "rejected" && event.status !== "duplicated") {
    logger.error(`Event ${event.id} has an invalid status`, {
      event: event.id,
      status: event.status,
    });
    return false;
  }

  // check if timeStamp is within the last week and is a valid timestamp
  try {
    const timeStamp = new Date(event.timeStamp);
    const timeStampInSeconds = timeStamp.getTime() / 1000;
    const currentTimeInSeconds = new Date().getTime() / 1000;
    const timeDifference = currentTimeInSeconds - timeStampInSeconds;
    if (timeDifference > 604800) {
      return false;
    }
  } catch (e) {
    logger.error(`Event ${event.id} has an invalid timeStamp`, {
      event: event.id,
      timeStamp: event.timeStamp,
    });
    return false;
  }
  return true;
}

module.exports = {
  processFile
};
