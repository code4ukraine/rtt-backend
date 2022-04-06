const AWS = require('aws-sdk');
const { S3_WEB_BUCKET_NAME } = require('./shared/consts.js');
const Logger = require('node-json-logger');
const logger = new Logger();

async function uploadToS3(data) {
  const fileName = 'data/data.json';
  const s3 = new AWS.S3({apiVersion: '2006-03-01'});

  try {
    await s3.putObject({
      Bucket: S3_WEB_BUCKET_NAME,
      Key: fileName,
      Body: data
    }).promise();

    logger.info('Successfully updated s3', {
      bucket: S3_WEB_BUCKET_NAME,
      fileName: fileName,
    })
  } catch (err) {
    logger.error('Failed to update s3', {
      bucket: S3_WEB_BUCKET_NAME,
      error: err,
      fileName: fileName,
    });

    throw err;
  }
}

async function uploadData(data) {
  await uploadToS3(data);
}

module.exports = {
  uploadData
}
