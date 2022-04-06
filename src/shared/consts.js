const process = require('process');

module.exports = {
  USER_UPLOADS_TABLE_NAME: process.env.DYNAMO_UPLOADS_TABLE,
  REVIEWED_UPLOADS_TABLE_NAME: process.env.DYNAMO_REVIEWED_TABLE,
  S3_WEB_BUCKET_NAME: process.env.S3_WEB_BUCKET_NAME,
  REGION: "us-east-2",
};
