var Ig4 = require('./classes/Ig4');
var Human = require('./classes/Human');
var { user, pass } = require('./cred');
let mode = Ig4.mode.text;
let configPath = './config';
process.argv.forEach( val => {
  if (val === "-json") {
    mode = Ig4.mode.json;
  }
  if (val.match(/^-config=/)) {
    configPath = val.substr(8);
  }
});

var { sessionDuration, tags, maxTagsCombined, maxLikesPerSession, maxFollowsPerSession, followDuration, likeDuration, statusRate, unfollowTime, unlikeTime, trackLikes, trackFollows, maxFollowSessionDelay, maxLikeSessionDelay, startLikeDelay, startFollowDelay } = require(configPath);
let client = new Ig4("ig" + user + "ig", { maxTagsCombined, unfollowTime, unlikeTime, trackLikes, trackFollows, mode });
const hour = 60 * 60 * 1000;

client.login(user, pass).then( () => {

  // Cleanup
  // return client.status().then(() => {
  //   Promise.all([client.unfollowOld(followDuration), client.unlikeOld(likeDuration * 2)]).then( () => {
  //     client.status().then(() => {
  //       console.log('done');
  //     });
  //   });
  // });

  // Setup
  client.setRelevantTags(tags);
  client.autoFollowCleanUpPeriod(30000, followDuration);
  client.autoLikeCleanUpPeriod(30000, likeDuration);
  client.statusPeriod(statusRate);

  setTimeout( () => {
    client.autoLikePeriod(sessionDuration, maxLikesPerSession, maxLikeSessionDelay);
  }, startLikeDelay);
  setTimeout( () => {
    client.autoFollowPeriod(sessionDuration, maxFollowsPerSession, maxFollowSessionDelay)
  }, startFollowDelay);

}).catch( err => {
  console.log(err);
});
