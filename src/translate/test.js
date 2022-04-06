const combinedData = require('./sampleData.json')
const translate = require('./translate.js') 

console.log('(Demo) Translating Combined Data:')
translate.translateCombinedData(combinedData).then(res => {
    console.log(res)
    console.log(res[0].translations)
})