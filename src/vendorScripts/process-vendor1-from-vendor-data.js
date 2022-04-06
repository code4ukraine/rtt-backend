const csv = require('csvtojson');

const runVendorScript = async function(csvData) {
  const jsonObj = await csv().fromString(csvData);

  const UkraineRegions = ["Chernihiv", "Chernihivs'ka", "Chernivtsi", "Dnipropetrovsk", "Donetsk", "Ivano-Frankivsk", "Kharkiv", "Kherson", "Khmelnytskyi", "Kyiv", "Kirovohrad", "Luhansk", "Lviv", "Mykolaiv", "Odessa", "Poltava", "Rivne", "Sumy", "Ternopil", "Vinnytsia", "Volyn", "Zakarpattia", "Zaporizhzhia", "Zhytomyr", "Zhitomyr"];

  const COMBAT = "Combat";
  const RUSSIAN_LOCATION = "Sighting";
  const FILTER_OUT = "Filter";
  const STRIKE = "Strike";
  const ABANDONED = "Abandoned";

  function commaEscape(text){
      if (typeof text != "string"){
          return text;
      }

      if (text.indexOf(",")) {
          return `"${text}"`
      } else {
          return text;
      }
  }

  const heuristics = {
    "fired at Ukrainian troops": FILTER_OUT,
    "Ukrainian Ministry of Defence claims to have captured": FILTER_OUT,
    "special forces engaging Russian armour": FILTER_OUT,
    "struck and damaged": STRIKE,
    "reports the presence of": RUSSIAN_LOCATION,
    "Ukrainian Ministry of Defence claims to have conducted an airstrike": FILTER_OUT,
    "operating out of": RUSSIAN_LOCATION,
    "passing northbound into": RUSSIAN_LOCATION,
    "aftermath of a Ukrainian strike": FILTER_OUT,
    "engaged combat with attacking Russian forces": COMBAT,
    "Russian forces are conducting offensive operations": COMBAT,
    "attack against a target": COMBAT,
    "stated Russian forces are operating": RUSSIAN_LOCATION,
    "presence of a Russian logistics camp": RUSSIAN_LOCATION, //logistics
    "reports the presence of Russian forces": RUSSIAN_LOCATION,
    "forces reported active": RUSSIAN_LOCATION,
    "wreckage": ABANDONED,
    "destroyed": ABANDONED,
    "air to air combat": COMBAT,
    "captured the town": RUSSIAN_LOCATION,
    "skirmish": COMBAT,
    "halted Russian forces": COMBAT,
    "deployed a pontoon bridge": RUSSIAN_LOCATION,
    "Russian forces tried and failed": RUSSIAN_LOCATION,
    "deployed": RUSSIAN_LOCATION, // planes
    "dead": ABANDONED,
    "fired upon": COMBAT,
    "Combat operations": ABANDONED,
    "forces equipped with ": RUSSIAN_LOCATION,
    "heavy fighting":COMBAT,
    "halted a Russian advance":COMBAT,
    "separatists have captured":COMBAT,
    "heavy urban combat ": COMBAT,
    "reports of Russian troops occupying": RUSSIAN_LOCATION,
    "burning Russian": FILTER_OUT,
    "Russian soldier being taken prisoner by Ukrainian civilians": FILTER_OUT,
    "civilians have established barracades": FILTER_OUT,
    "capture of Russian troops": FILTER_OUT,
    "Russian soldier being taken prisoner by Ukrainian civilians": FILTER_OUT,
    "burning Russian": FILTER_OUT,
    "Ukrainian UAV": FILTER_OUT,
    "Ukrainian military equipment": FILTER_OUT,
    "damaged": ABANDONED,
    "abandoned": ABANDONED,
    "blocking the passage of Russian armour through the town": FILTER_OUT,
    "looting": RUSSIAN_LOCATION,
    "distributing humanitarian aid to civilians": FILTER_OUT,
    "shot down": ABANDONED,
    "shootdown of a": ABANDONED,
    "being captured by Ukrainian civilians": FILTER_OUT,
    "shows communications and logistics vehicles": RUSSIAN_LOCATION};


  function summarize(description) {
      description = description.split(".")[0];// take first sentence

      const regExps = [/Ukraine's Ministry of Defence reports it /,  /The Ukrainian Ministry of Defence reports /, /The Ukrainian Ministry of Defence stated the /, /The Ukrainian Ministry of Defence stated the /];

      regExps.forEach(regexp => {
          description = description.replace(regexp, "");
      })
      return description[0].toUpperCase() + description.substring(1);
  }

  function rtt_event_type(event) {
      const civiliansRE = new RegExp("(residential|civilian|nursery|civilians|destroyed house|residences)");
      const strikesRE = new RegExp("(missile|shelled|shelling|airstrike|strike|rocket|rocket attack|conducting strikes)");
      const patrollingRE = new RegExp("Russian.*patrolling");
      const aftermathRE = new RegExp("aftermath.*Ukrainian attack");

      for (let heuristic in heuristics) {
          if (event.description.indexOf(heuristic) > -1 ) {
              return heuristics[heuristic];
          }
      }
      if (event.description.match(strikesRE)){
          return STRIKE;
      } else if (event.description.match(patrollingRE)) {
          return RUSSIAN_LOCATION;
      } else if (event.description.match(aftermathRE)) {
          return FILTER_OUT
      }

      if (event.force_monitoring_event_type_label == "Sighting") {
          return RUSSIAN_LOCATION;
      } else if (event.force_monitoring_event_type_label == "Combat operations") {
          /*if (event?.organization_type_label.indexOf("Mechanised") > -1) {
              return RUSSIAN_LOCATION;
          } else if (event?.organization_type_label = "") {*/
              return RUSSIAN_LOCATION;
          /*} else {
              return COMBAT;
          }*/
      } else if (event.force_monitoring_event_type_label == "Non-combat operations") {
          //if (event?.organization_type_label != "Medical") {
              return RUSSIAN_LOCATION;
          //}
      } else {
          return `${event.force_monitoring_event_type_label} ${event.organization_type_label}`;
      }
  }

  const seenLatLong = {};

  const fiveDaysAgo = new Date().setDate(-5);
  const relevantEvents = jsonObj
      .filter(event => new Date(event.reported_date) > fiveDaysAgo )
      .filter(event => event.event_location_lat && event.event_location_long)
      .sort((a,b) =>  +(new Date(b.reported_date)) - +(new Date(a.reported_date)))
      .map(event => {
          const lat = parseFloat(event.event_location_lat);
          const lng = parseFloat(event.event_location_long);
          // ensure locations are never duplicated exactly
          if (seenLatLong[`${lat}${lng}`]) {
              seenLatLong[`${lat}${lng}`] = seenLatLong[`${lat}${lng}`] + 1;
              lat = parseFloat(String(lat) + `${seenLatLong[`${lat}${lng}`]}`);
          } else {
              seenLatLong[`${lat}${lng}`] = 0;
          }
          return {
              id: event.id,
              lat: parseFloat(lat),
              lng: parseFloat(lng),
              title: summarize(event.description),
              timestamp: event.reported_date,
              timestamp_confidence: "24h",
              rtt_event_type: rtt_event_type(event),
              description: event.description,
              latlng_confidence: event.geoprecision_label,
          };
      })
      .filter(event => event.rtt_event_type != FILTER_OUT);
  return relevantEvents;
};

// export runVendorScript with module.exports
module.exports = {
    runVendorScript: runVendorScript
};

