const csv = require('csvtojson');
const { Translate } = require('@google-cloud/translate').v2;
const fs = require('fs')
const process = require('process');
const { parse } = require('json2csv');



const data = fs.readFileSync(process.argv[2], 'utf8')

const TRANSLATE_KEY = process.env.GOOGLE_TRANSLATE_KEY

async function translate() {

  const translateClient = new Translate({ key: TRANSLATE_KEY });
  const messages = await csv().fromString(data);
  const latest = messages.filter(m => parseInt(m.iteration) == parseInt(process.argv[3]));
  for (m of latest) {
    const [translationRes] = await translateClient.translate([m.message], "en");
    m.english = translationRes[0];
  }

    try {
      const fields = ['channel', 'id', 'posted_at', 'message', 'english', 'edited_at'];
      const opts = { fields };
      const csv = parse(latest, opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
}

translate ()