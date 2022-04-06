const AWS = require('aws-sdk');
const { USER_UPLOADS_TABLE_NAME, REVIEWED_UPLOADS_TABLE_NAME, REGION } = require('./shared/consts.js');
s3 = new AWS.S3({apiVersion: '2006-03-01'});
const vendor1 = require('./vendorScripts/process-vendor1-from-vendor-data.js');
const Logger = require('node-json-logger');
const logger = new Logger();

var params = {
  Bucket: "rtt-janes-61aff6eee95bdefc4aeffe42",
  Key: "janes/ofm_orbats.csv"
};

async function getVendorCSV() {
  try {
    const data = await s3.getObject(params).promise();

    return data.Body.toString();
  } catch (err) {
    logger.error('Failed to fetch vendor csv', {
      bucket: params.Bucket,
      error: err,
      key: params.Key,
    });

    throw err;
  }
}

async function returnVendorCSV() {
  const data = await getVendorCSV();
  const vendorDataJson = await vendor1.runVendorScript(data);
  return data;
}

module.exports = {
  returnVendorCSV
}

