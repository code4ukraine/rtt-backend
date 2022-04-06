const { Translate } = require('@google-cloud/translate').v2;
const async = require('async');
const crypto = require('crypto');
const Logger = require('node-json-logger');
const logger = new Logger();
const metrics = require('../metrics.js');
const process = require('process');
const redis = require('redis');

const TRANSLATE_KEY = process.env.GOOGLE_TRANSLATE_KEY;
const translateClient = new Translate({ key: TRANSLATE_KEY });

const targetLangs = ['uk', 'ru'];

const redisClient = redis.createClient({
    url: `rediss://${process.env.TRANSLATIONS_REDIS || 'localhost'}:6379`,
});
const cacheStats = { 'hits': 0, 'misses': 0 };

async function init() {
    return redisClient.connect();
}

function sha256(string) {
    return crypto.createHash('sha256').update(string).digest('hex');
}

async function translateOneItem(item) {
    const translations = {}
    for (const lang of targetLangs) {
        translations[lang] = {
            title: await translateOneString(item.title, lang),
            description: await translateOneString(item.description, lang),
        };
    }

    return {
        ...item,
        translations,
    };
}

async function translateOneString(string, lang) {
    // Cache key format: language:sha256(text)
    const cacheKey = [lang, sha256(string)].join(':');
    const cacheValue = await redisClient.get(cacheKey);
    if (cacheValue !== null) {
        cacheStats.hits += 1;
        return Buffer.from(cacheValue, 'base64').toString('utf8');
    }

    cacheStats.misses += 1;
    const [translationRes] = await translateClient.translate(string, lang);
    await redisClient.set(cacheKey, Buffer.from(translationRes).toString('base64'));

    return translationRes;
}

async function translateCombinedData(combinedData) {
    const translatedData = [];

    await async.mapLimit(combinedData, 10, async function (combinedDataItem) {
        translatedData.push(await translateOneItem(combinedDataItem));
    });

    logger.info('Google translate cache hit stats', {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
    });
    metrics.put('translationsCache', 'Count', cacheStats.hits, [
        {
            Name: 'get',
            Value: 'hits',
        },
    ]);
    metrics.put('translationsCache', 'Count', cacheStats.misses, [
        {
            Name: 'get',
            Value: 'misses',
        },
    ]);

    // reset cache counters for next run
    cacheStats.hits = 0;
    cacheStats.misses = 0;

    return translatedData;
}

module.exports = {
    init,
    translateCombinedData,
}
