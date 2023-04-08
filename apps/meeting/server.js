// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/* eslint-disable */
const compression = require('compression');
const fs = require('fs');
const url = require('url');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
/* eslint-enable */

let hostname = '127.0.0.1';
let port = 8080;
let protocol = 'http';
let options = {

};

AWS.config.update(
  {
    accessKeyId: 'ASIATCNAXVS7E5WDEJGI', 
    secretAccessKey:'U9sxg0jMRJe1W3J9BsqkkLWOFSlPgsUWq9J9c7Ot',
    sessionToken: 'IQoJb3JpZ2luX2VjEB0aCXVzLWVhc3QtMSJIMEYCIQD+89hpS60r4kcpf+qmhDEla1LfGR27gljTiQJmG79kawIhANu4QH1IuTKN/orm4ndX7/TcEDNURriHtd+zT8kY7tXzKpkDCPb//////////wEQAhoMMjExMzI3MzY0Mjg2IgwHlFltwyAz1XwCczUq7QKrajVzlbDh4cDklNs8lJ+CQvKvbc3HftzGNe8ozk7S/cmklxcEco0HnaoaoiuJ08o7d7LBFMG1i3DiuoUsEZfcIEjuVGqxlTGN3DPfuhmOcqh5apqQqVRujuULXVNFbm21spE9qlLHEJfoWiz3Sx0XDIWS10+gSZuO3YBx3ku0dalxF3bVA/n70E+4YUnCgKARJC60DVIbo6zcF8tIEei/LY9+WxGUJRhr1WJ61LCYNjv0PV0Y0R+CSjNN4u9tveibRI3dmIl67p19cn2Cpeyatq5+9dorwKgtZ10CASHvToHTOZUZjbGxxkntj+2+nIPpSguGdpzkE9sin5WHbZi7vMhW/DNJX+A/kAFj/KcUQT/ovsYe0lNWJ8Wpon3EfRqQmKAjFEZvsiStJE632BH5dskyxE2b9znUNssKsaYZCbxXeY3k5pjw5mKFg0puH8OVJGET3o6ZtsL6PSTx49+AiClMBgjVnik3mNrdUDDmlrKhBjqlAfBuYnhC9z/fAM0c3hBqcHMblnUKj2WgUTFufTV6dfLbHY77r2Y1jhmb0BJYaGHPi1rrI20zffpYnLh61kRBXKzt+s+OnZOpSXCeaIP4LCUNEu/H4ZQXXE8+kxTCwF+t0SxsK/0IilMaOK2yKaxJONoCR0BEqWZxn9ZBE/bTjCnmZj15Yb60BfL+BXfNLD0hPvfyJJzinfoddjGwr3qXRNObvurk7A==',
    region: 'us-east-1'
  }
)
const chime = new AWS.Chime({ region: 'us-east-1' });
const alternateEndpoint = process.env.ENDPOINT;

// Optional features like Echo Reduction is only available on Regional Meetings API
// https://docs.aws.amazon.com/chime/latest/APIReference/API_Operations_Amazon_Chime_SDK_Meetings.html
const chimeRegional = new AWS.ChimeSDKMeetings({ region: 'us-east-1' });
const chimeRegionalEndpoint = process.env.REGIONAL_ENDPOINT || 'https://meetings-chime.us-east-1.amazonaws.com';
chimeRegional.endpoint = new AWS.Endpoint(chimeRegionalEndpoint);

if (alternateEndpoint) {
  console.log('Using endpoint: ' + alternateEndpoint);
  chime.createMeeting({ ClientRequestToken: uuidv4() }, () => {});
  AWS.NodeHttpClient.sslAgent.options.rejectUnauthorized = false;
  chime.endpoint = new AWS.Endpoint(alternateEndpoint);
} else {
  chime.endpoint = new AWS.Endpoint(
    'https://service.chime.aws.amazon.com/console'
  );
}

// return regional API just for Echo Reduction for now.
function getClientForMeeting(meeting, echoReduction = 'false') {
  if ( echoReduction === 'true' || (
    meeting &&
    meeting.Meeting &&
    meeting.Meeting.MeetingFeatures &&
    meeting.Meeting.MeetingFeatures.Audio &&
    meeting.Meeting.MeetingFeatures.Audio.EchoReduction === 'AVAILABLE')
  ) {
      return chimeRegional;
    }
  return chime;
}

const meetingCache = {};
const attendeeCache = {};

const log = message => {
  console.log(`${new Date().toISOString()} ${message}`);
};



const app = process.env.npm_config_app || 'meeting';


const server = require(protocol).createServer(
  options,
  async (request, response) => {
    log(`${request.method} ${request.url} BEGIN`);
    compression({})(request, response, () => {});
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    try {
      if (
        request.method === 'POST' &&
        request.url.startsWith('/join?')
      ) {
        const query = url.parse(request.url, true).query;
        const title = query.title;
        const name = query.name;
        const region = query.region || 'us-east-1';

        const client = getClientForMeeting(meetingCache[title], query.ns_es);
        if (!meetingCache[title]) {
          let request = {
            ClientRequestToken: uuidv4(),
            MediaRegion: region,
            ExternalMeetingId: title.substring(0, 64),
          };
          if (query.ns_es === 'true') {
            request.MeetingFeatures = {
              Audio: {
                // The EchoReduction parameter helps the user enable and use Amazon Echo Reduction.
                EchoReduction: 'AVAILABLE'
              } 
            };
          }
          meetingCache[title] = await client.createMeeting(request).promise();
          attendeeCache[title] = {};
        }
        const joinInfo = {
          JoinInfo: {
            Title: title,
            Meeting: meetingCache[title].Meeting,
            Attendee: (
              await client
                .createAttendee({
                  MeetingId: meetingCache[title].Meeting.MeetingId,
                  ExternalUserId: uuidv4()
                })
                .promise()
            ).Attendee
          }
        };
        attendeeCache[title][joinInfo.JoinInfo.Attendee.AttendeeId] = name;
        response.statusCode = 201;
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify(joinInfo), 'utf8');
        response.end();
        log(JSON.stringify(joinInfo, null, 2));
      } else if (
        request.method === 'GET' &&
        request.url.startsWith('/attendee?')
      ) {
        const query = url.parse(request.url, true).query;
        const attendeeInfo = {
          AttendeeInfo: {
            AttendeeId: query.attendee,
            Name: attendeeCache[query.title][query.attendee]
          }
        };
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify(attendeeInfo), 'utf8');
        response.end();
        log(JSON.stringify(attendeeInfo, null, 2));
      } else if (
        request.method === 'POST' &&
        request.url.startsWith('/meeting?')
      ) {
        const query = url.parse(request.url, true).query;
        const title = query.title;
        if (!meetingCache[title]) {
          meetingCache[title] = await chime
            .createMeeting({
              ClientRequestToken: uuidv4()
              // NotificationsConfiguration: {
              //   SqsQueueArn: 'Paste your arn here',
              //   SnsTopicArn: 'Paste your arn here'
              // }
            })
            .promise();
          attendeeCache[title] = {};
        }
        const joinInfo = {
          JoinInfo: {
            Title: title,
            Meeting: meetingCache[title].Meeting
          }
        };
        response.statusCode = 201;
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify(joinInfo), 'utf8');
        response.end();
        log(JSON.stringify(joinInfo, null, 2));
      } else if (request.method === 'POST' && request.url.startsWith('/end?')) {
        const query = url.parse(request.url, true).query;
        const title = query.title;
        const client = getClientForMeeting(meetingCache[title]);
        await client
          .deleteMeeting({
            MeetingId: meetingCache[title].Meeting.MeetingId
          })
          .promise();
        response.statusCode = 200;
        response.end();
      } else if (request.method === 'POST' && request.url.startsWith('/logs')) {
        console.log('Received logs in the local server');
        response.end('Received logs in the local server');
      } else {
        response.statusCode = 404;
        response.setHeader('Content-Type', 'text/plain');
        response.end('404 Not Found');
      }
    } catch (err) {
      log(`server caught error: ${err}`);
      response.statusCode = 403;
      response.setHeader('Content-Type', 'application/json');
      response.write(JSON.stringify({ error: err.message }), 'utf8');
      response.end();
    }
    log(`${request.method} ${request.url} END`);
  }
);

server.listen(port, hostname, () => {
  log(`server running at ${protocol}://${hostname}:${port}/`);
});
