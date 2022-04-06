const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();
const Logger = require('node-json-logger');
const logger = new Logger();
const process = require('process');
const metricsUpdates = [];

// send all pending metrics updates
async function flush() {
  logger.debug('Flushing metrics', { count: metricsUpdates.length })

  try {
    await cloudwatch.putMetricData({
      MetricData: metricsUpdates,
      Namespace: 'dataprocessing',
    }).promise();
  } catch (err) {
    logger.warn('Error publishing metric data', { error: err, });
  }

  metricsUpdates.length = 0
}

// batch up metric updates to run at the end of the lambda
function put(name, unit, value, dimensions=[]) {
  metricsUpdates.push({
    MetricName: name,
    Dimensions: dimensions.concat([
      {
        Name: 'environment',
        Value: process.env.LAMBDA_ENV || 'local',
      },
    ]),
    Unit: unit,
    Value: value,
  });
}

module.exports = {
  flush,
  put,
};
