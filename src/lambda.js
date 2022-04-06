const metrics = require('./metrics.js');
const translate = require('./translate/translate.js');
const updateSpreadsheet = require('./updateSpreadsheet.js');
const uploadFinalReviewedData = require('./uploadFinalReviewedData.js');

const translateInitPromise = translate.init();

exports.handler = async (event, context) => {
  // make sure we're connected to redis
  await translateInitPromise;

  // update spreadsheet with latest data to review
  await updateSpreadsheet.updateSpreadsheet();

  // upload final reviewed data (combined with vendor data) to S3
  await uploadFinalReviewedData.uploadFinalReviewedData();

  await metrics.flush();
}
