const AWS = require('aws-sdk');

const sampleData = [
  {
    id: 1,
    description: "Aircraft crash near the border of Ukraine",
    location: {
      lat: "49.839",
      lng: "24.0297"
    },
    images: ['www.google.com', 'www.facebook.com'],
    timeStamp: "1646610112",
    latlng_confidence: "<1 mile",
    event_type: "Sighting",
    sighting: {
      actor: "Aircraft",
      num_seen: "1",
    },
    sources: ["User Reported"],
    status: "unreviewed"
  },
  {
    id: 2,
    description: "Tank Column headed east",
    location: {
      lat: "49.839",
      lng: "24.0297"
    },
    images: ['www.google.com', 'www.facebook.com'],
    timeStamp: "1646610112",
    latlng_confidence: "<1 mile",
    event_type: "Strike",
    sighting: {
      actor: "Tanks",
      num_seen: "8",
    },
    sources: ["User Reported"],
    status: "unreviewed"
  },
  {
    id: 3,
    description: "Helicopter Crash from RPG",
    location: {
      lat: "49.839",
      lng: "24.0297"
    },
    images: ['www.google.com', 'www.facebook.com'],
    timeStamp: "1646610112",
    latlng_confidence: "<1 mile",
    event_type: "Sighting",
    sighting: {
      actor: "Aircraft",
      num_seen: "1",
    },
    sources: ["User Reported"],
    status: "unreviewed"
  },
  {
    id: 4,
    description: "Troop Convoy",
    location: {
      lat: "49.839",
      lng: "24.0297"
    },
    images: ['www.google.com', 'www.facebook.com'],
    timeStamp: "1646610112",
    latlng_confidence: "<1 mile",
    event_type: "Sighting",
    sighting: {
      actor: "Trucks",
      num_seen: "26",
    },
    sources: ["User Reported"],
    status: "unreviewed"
  },
  {
    id: 5,
    description: "Soldiers attacking locals in Ukraine",
    title: "Soldiers attacking locals in Ukraine",
    location: {
      lat: "49.839",
      lng: "24.0297"
    },
    images: ['www.google.com', 'www.facebook.com'],
    timeStamp: "1646610112",
    latlng_confidence: "<1 mile",
    event_type: "Strike",
    sighting: {
      actor: "Soldier in Civilian Clothing",
      num_seen: "10",
    },
    sources: ["User Reported"],
    status: "unreviewed"
  }
]

AWS.config.update({
    region: "us-east-2"
});
  
var docClient = new AWS.DynamoDB.DocumentClient();

function processFile() {
  sampleData.forEach(function (event) {
      var params = {
          TableName: "dev-user-uploads",
          Item: {
              "id": event.id.toString(),
              "created_at": parseInt(new Date().getTime() / 1000),
              "timeStamp": event.timeStamp,
              "description": event.description,
              "location": {
                  "lat": event.location.lat,
                  "lng": event.location.lng
              },
              "images": event.images,
              "latlng_confidence": event.latlng_confidence,
              "event_type": event.event_type,
              "sighting": {
                  "actor": event.sighting.actor,
                  "num_seen": event.sighting.num_seen
              },
              "sources": event.sources,
              "status": event.status
          }
      };
      docClient.put(params, function (err, data) {
          if (err) {
              console.log(err);
          } else {
              console.log(data);
          }
      });
  });
}
processFile();
