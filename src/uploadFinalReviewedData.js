const cleanReviewedData = require('./utils/scrubReviewedData.js');
const vendor1 = require('./vendorScripts/process-vendor1-from-vendor-data.js');
const vendorFromS3 = require('./getVendorCSV.js');
const uploadToS3 = require('./uploadFinalDataToS3.js');
const getData = require('./utils/getAWSDataFromTable.js');
const metrics = require('./metrics.js');
const translate = require('./translate/translate.js')

const { REVIEWED_UPLOADS_TABLE_NAME } = require('./shared/consts.js');
const Logger = require('node-json-logger');
const logger = new Logger();

// Pull reviewed user data, combine with scrubbed vendor data, and upload
// a final data CSV to s3
// TODO(fetep): put in a seatbelt to abort if the number of data points is drastically
// decreasing
async function uploadFinalReviewedData() {
  const reviewed = await getData.loadDynamoData(REVIEWED_UPLOADS_TABLE_NAME);
  const jsonScrubbedReviewed = cleanReviewedData.scrubData(reviewed);
  const vendorDataJson = await vendor1.runVendorScript(await vendorFromS3.returnVendorCSV());
  const combinedData = vendorDataJson.concat(jsonScrubbedReviewed);
  const combinedDataWithTranslations = await translate.translateCombinedData(combinedData)

  // all data elements have an 'id', sort by the 'id' to end up with a consistently
  // ordered data.json (easier to compare over time and across code changes). translate
  // runs lots of tasks in parallel, and the order is determined by what returns first
  combinedDataWithTranslations.sort(function(a, b) {
    if (a.id > b.id) {
      return 1;
    } else if (b.id > a.id) {
      return -1;
    } else {
      return 0;
    }
  });

  // remove 'id' (no need to expose that to the frontend/users)
  combinedDataWithTranslations.forEach(item => {
    if ('id' in item) {
      delete item.id;
    } else {
      logger.warn('item missing id', {item: item});
    }
  });

  await uploadToS3.uploadData(JSON.stringify(combinedDataWithTranslations));

  // generate some metrics on our freshly generated data file
  logger.info('data.json stats', {
    userUpload: jsonScrubbedReviewed.length,
    vendorJanes: vendorDataJson.length,
  });

  metrics.put('dataPoints', 'Count', jsonScrubbedReviewed.length, [
    {
      Name: 'source',
      Value: 'userUpload',
    }
  ])
  metrics.put('dataPoints', 'Count', vendorDataJson.length, [
    {
      Name: 'source',
      Value: 'vendorJanes',
    }
  ])
}

module.exports = {
  uploadFinalReviewedData
};
