const incomingSchema = {
  event_type: 'Sighting',
  photo_location: 'undefined',
  location: { description: 'test location', lat: '', lon: '' },
  created_at: '3/7/2022, 8:18:59 PM',
  reviewed_at: 1646769443,
  status: 'approved',
  timeStamp: '2:30pm',
  description: 'test description',
  id: '4c1f6a18-17c3-460c-a84c-1fb9976096ee',
  sightings: {
    Soldier: 'undefined',
    'High Mobility Vehicle': 'undefined',
    Other: 'undefined'
  }
}

const outgoingSchema = {
  "id":"https://data.janes.com/events/lNStj",
  "lat":50.3150962,
  "lng":34.9005644,
  "title":"Images posted to social media by the Ukrainian 93rd Mechanised Brigade claims to show abandoned and destroyed 4TH TANK DIVISION Kamaz-43501 and BMP-2 in the OKHTYRKA AREA",
  "timestamp":"2022-03-07",
  "timestamp_confidence":"24h",
  "rtt_event_type":"Abandoned",
  "description":"Images posted to social media by the Ukrainian 93rd Mechanised Brigade claims to show abandoned and destroyed 4TH TANK DIVISION Kamaz-43501 and BMP-2 in the OKHTYRKA AREA.",
  "latlng_confidence":"<5 miles"
}

function createTitle(event) {
  var title = event.description;
  if (event.sightings) {
    let newTitle = 'Reports of the following: ';
    for (var key in event.sightings) {
      if (event.sightings[key] !== 'undefined') {
        if (key === 'Other') {
          newTitle += 'Unidentified Combatants: ' + event.sightings[key] + ', ';
        }
        newTitle += `${key}: ${event.sightings[key]}, `;
      }
    }
    title = newTitle.substring(0, newTitle.length - 2);
  }
  if (title.length > 100) {
    title = title.substring(0, 100);
    title += '...';
  }
  return title;
}

function createTimestamp(event) {
  var timestamp = new Date(event.created_at);
  var userTimeStamp = new Date(event.timeStamp);
  // check is user time stamp is valid
  if (userTimeStamp.toString() !== 'Invalid Date') {
    timestamp = userTimeStamp;
  }
  return timestamp.toISOString();
}

function generateDescription(event) {
  var description = event.description;
  if (description.length > 500) {
    description = description.substring(0, 500);
  }
  return description;
}

function latLngConfirm(data) {
  const confirmed = [];
  data.forEach(function (event) {
    if (!isNaN(event.lat) && !isNaN(event.lng)) {
      confirmed.push(event);
    }
  });
  return confirmed;
}

function scrubData(jsonInput) {
  let seenLatLong = {};
  const scrubbedData = [];
  jsonInput.forEach(function (event) {
    var scrubbedEvent = {
      id: event.id,
      lat: parseFloat(event.location.lat),
      lng: parseFloat(event.location.lon),
      title: createTitle(event),
      timestamp: createTimestamp(event),
      timestamp_confidence: "24h",
      rtt_event_type: "Sighting",
      description: generateDescription(event),
      latlng_confidence: "< 5 miles"
    }
    scrubbedData.push(scrubbedEvent);
  });

  const latLngConfirmed = latLngConfirm(scrubbedData);

  latLngConfirmed
    .sort((a,b) =>  +(new Date(b.created_at)) - +(new Date(a.created_at)))
    //filter out events older than a week ago
    .filter(function (event) {
      var timestamp = new Date(event.timestamp);
      var now = new Date();
      return timestamp > now - 7 * 24 * 60 * 60 * 1000;
    })
    .map(event => {
      const lat = parseFloat(event.lat);
      const lng = parseFloat(event.lng);
      // ensure locations are never duplicated exactly
      if (seenLatLong[`${lat}${lng}`]) {
          seenLatLong[`${lat}${lng}`] = seenLatLong[`${lat}${lng}`] + 1;
          lat = parseFloat(String(lat) + `${seenLatLong[`${lat}${lng}`]}`);
      } else {
          seenLatLong[`${lat}${lng}`] = 0;
      }
      return {
        ...event,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };
  });

  return latLngConfirmed;
}

module.exports = {
  scrubData
}
