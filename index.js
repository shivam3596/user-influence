const express = require('express');
const bodyParser = require('body-parser');
const {howManyTimes, trackingIds, capturedTimeInterval} = require('./config.json');
const Memcached = require('memcached');
const events = [getUserEvent, getSignUpEvent];

const app = express();
const PORT = process.env.PORT || 8080;
const memcached = new Memcached();

memcached.connect('localhost:11211', function( err, conn ){
  if( err ) {
    console.log( conn.server,'error while memcached connection!!');
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/generate', (req, res) => {
  try{
    let events = [];

    setInterval(function() {
      for(let i=0; i <howManyTimes; i++){
        let createdEvent = createRandomEvents();
        events.push(createdEvent);
      }
    }, 1000);

    setInterval(function() {
      let timesAgo = new Date( Date.now() - capturedTimeInterval * 1000 * 60 ).getTime();
      let filterEventsByTime = events.filter(function (el) {
        return el.value.timestamp > timesAgo && el.value.timestamp <= new Date().getTime()
      });

      let groupByEvent = filterEventsByTime.reduce((r, a) => {
        r[a.value.event] = [...r[a.value.event] || [], a];
        return r;
      }, {});

      let resultObj = {};

      for (let key of Object.keys(groupByEvent)) {
        let trackingObj = {};
        let eventGroupByTrackingId = groupByTrackingId(groupByEvent[key]);
        for (let key of Object.keys(eventGroupByTrackingId)) {
          trackingObj[key] = eventGroupByTrackingId[key].length;
        }
        resultObj[key] = {
          "totalEventsCaptured": groupByEvent[key].length,
          "eventsCapturedByTrackingIds": trackingObj
        }
      }
      //set data in memcached
      memcached.set('events', resultObj, 300, function (err) {
        if(err) throw new err;
      });
    },10000);

  }catch(err){
    console.log(err.message);
  }
});

app.get('/result', (req, res) => {
  try{
    memcached.get('events', function (err, data) {
      res.send({data: data});
    });
  }catch(err){
    console.log(err.message);
  }
});

function groupByTrackingId(items){
  let groupByTrackingId = items.reduce((r, a) => {
    r[a.value.trackingId] = [...r[a.value.trackingId] || [], a];
    return r;
  }, {});
  return groupByTrackingId;
}

function createRandomEvents(){
  let randomTrackingId = trackingIds[Math.floor(Math.random() * trackingIds.length)];
  let randomEvent = events[Math.floor(Math.random() * events.length)];

  let createdEvent = (randomEvent)(randomTrackingId);
  return createdEvent;
}

function getUserEvent(trackingId){
  let userEvent = {
    "path":"/visitors/events/",
    "value":{
      "fingerprint":"5d4697775392fc850a737fe225fbd8e9",
      "sessionId":"25ad9867-e9a5-cedf-0fc4-0c30b1c2a505",
      "visitorId":"1bfdd0e4-2629-6ef9-21ea-9f1b1f11fe02",
      "trackingId": trackingId,
      "userId":null,
      "userProfile":null,
      "geo":{
        "latitude":28.58,
        "longitude":77.33,
        "city":"Noida",
        "country":"India",
        "ip":"103.83.128.17"
      },
      "target":{
        "id":"FPqR3acHqJeA3acH7MM9_0",
        "selector":"div#FPqR2DbIqJeA2DbI7MM9_0.animated_FPqR2bI7Mf_c.slideInDown:nth-child(23)>div#FPqR3tRBqJeA3tRB7MM9_0:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(2)>div#FPqR3dGiqJeA3dGi7MM9_0:nth-child(1)>div.FPqR2B_4qJeA2B_47MM9_0.rounded.FPqRD2zVqJeAD2zV7MM9_0:nth-child(1)>div#FPqR3acHqJeA3acH7MM9_0:nth-child(1)"
      },
      "timestamp": new Date().getTime(),
      "event":"click",
      "source":{
        "url":{
          "host":"useinfluence.co",
          "hostname":"useinfluence.co",
          "pathname":"/",
          "protocol":"https:"
        }
      },"referrer":""
    }
  };
  return userEvent;
}

function getSignUpEvent(trackingId){
  let signupEvent = {
    "path": "/visitors/events/",
    "value": {
      "fingerprint": "5d4697775392fc850a737fe225fbd8e9",
      "sessionId": "0da4fc08-3f12-5890-fdce-2455fc17c394",
      "visitorId": "be4ab37a-1de9-a0f0-f97n3-562b7cd4365e",
      "trackingId": trackingId,
      "userId": null,
      "userProfile": null,
      "geo": {
        "latitude": 28.58,
        "longitude": 77.33,
        "city": "Noida",
        "country": "India",
        "ip": "103.83.128.66"
      },
      "form": {
        "formId": "2bc04127-92d8-eb72-b1d3-26dc63f6ff19",
        "email": "agency@gmail.com",
        "anonymous": "Login"
      },
      "timestamp": new Date().getTime(),
      "event": "formsubmit",
      "source": {
        "url": {
          "host": "app.useinfluence.co",
          "hostname": "app.useinfluence.co",
          "pathname": "/login",
          "protocol": "https:"
        }
      },
      "referrer": ""
    }
  };
  return signupEvent;
}
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
