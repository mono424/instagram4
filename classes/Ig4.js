var Client = require('instagram-private-api').V1;
var fs = require('fs');
var jsonfile = require('jsonfile')
const chalk = require('chalk');
var _ = require('lodash');
var Human = require('./Human');
const log = console.log;
const dataDir = __dirname + '/../data';
const followStateFile = dataDir + "/auto-follow.json";
const likeStateFile = dataDir + "/auto-like.json";

const mode = {
  'json': Symbol("json"),
  'text': Symbol("text")
};

module.exports = class Ig4 {

  static get mode() {
    return mode;
  }

  constructor(devId = "someuser", { maxTagsCombined = 5, defaultLikeLimit = 5, defaultFollowLimit = 5, unfollowTime = 2000, unlikeTime = 2000, trackLikes = true, trackFollows = true, mode = Ig4.mode.text}){
    this.maxTagsCombined = maxTagsCombined;
    this.defaultLikeLimit = defaultLikeLimit;
    this.defaultFollowLimit = defaultFollowLimit;
    this.unfollowTime = unfollowTime;
    this.unlikeTime = unlikeTime;
    this.trackLikes = trackLikes;
    this.trackFollows = trackFollows;
    this.mode = mode;
    this.lastGotFeed = 0;
    this.autoFollowState = [];
    this.autoLikeState = [];
    this.periodStates = {
      autoFollow: false,
      autoLike: false,
      // followCleanup: false,
      // likeCleanup: false
    };
    this.device = new Client.Device(devId);
    this.storage = new Client.CookieFileStorage(dataDir + '/cookies/user.json');
    this.autoFollowLoadState();
    this.autoLikeLoadState();
  }

  login(username, password){
    let { device, storage } = this;
    return new Promise( (resolve, reject) => {
      Client.Session.create(device, storage, username, password).then( session => {
        this.session = session;
        resolve();
      }).catch(reject);
    });
  }

  setRelevantTags(tags){
    this.relTags = tags
    this.feeds = tags.map( tag => new Client.Feed.TaggedMedia(this.session, tag) );
  }

  ////////////
  // Status //
  ////////////

  statusPeriod(timeMs){
    if (this.mode === mode.text) {
      log(chalk.blue('Started Status Period'));
    }
    this.status();

    return setInterval(() => {
      this.status();
    }, timeMs);
  }

  status(){
    return new Promise( (resolve, reject) => {
      this.getAccount().then( acc => {

        let { pk, username, followerCount, followingCount } = acc._params;
        let { periodStates } = this;
        let autoFollowedCount = this.autoFollowState.length;
        let autoLikedCount = this.autoLikeState.length;
        if (this.mode === mode.text) {
          log(chalk.white('------------------------'));
          log(chalk.white( " " + chalk.underline('Your PK') + ":  " + chalk.bold(pk)) + " " );
          log(chalk.white( " " + chalk.underline('Your Username') + ":  " + chalk.bold(username)) + " " );
          log(chalk.white( " " + chalk.underline('Your Follower') + ":  " + chalk.green.bold(followerCount)) + " " );
          log(chalk.white( " " + chalk.underline('You Following') + ":  " + chalk.red.bold(followingCount)) + " " );
          log(chalk.white( " " + chalk.underline('Auto-Followed') + ":  " + chalk.bold(autoFollowedCount)) + " " );
          log(chalk.white( " " + chalk.underline('Auto-Liked') + ": " + chalk.bold(autoLikedCount)) + " " );
          log(chalk.white( " " + chalk.underline('AutoLike-Running') + ": " + chalk.bold(periodStates.autoLike ? "active" : "waiting")) + " " );
          log(chalk.white( " " + chalk.underline('AutoFollow-Running') + ": " + chalk.bold(periodStates.autoFollow ? "active" : "waiting")) + " " );
          log(chalk.white('------------------------'));
        }

        if (this.mode === mode.json) {
          log(this.jsonOutput('status', { pk, username, followerCount, followingCount, autoFollowedCount, autoLikedCount, periodStates }));
        }

        resolve();
      });
    });
  }

  completeCleanup(){
    return Promise.all([this.unfollowOld(0), this.unlikeOld(0)]);
  }

  jsonOutput(action, data) {
    let output = "";
    try {
      output = JSON.stringify({
        action,
        data
      });
    } catch (e) {
      output = JSON.stringify({
        action: "error",
        data : {
          type: "json",
          data: e
        }
      });
    }
    return output;
  }

  ////////////////
  // AutoFollow //
  ////////////////

  autoFollowCleanUpPeriod(timeMs, oldTimeMs){
    if (this.mode === mode.text) {
      log(chalk.blue('Started AutoFollow Cleanup Period'));
    }
    let running = true;
    this.unfollowOld(oldTimeMs).then( () => {
      running = false;
    }).catch(() => {
      running = false;
    });

    return setInterval(() => {
      if(running) return;
      running = true;
      this.unfollowOld(oldTimeMs).then(() => {
        running = false;
      }).catch(() => {
        running = false;
      });
    }, timeMs);
  }

  autoFollowPeriod(timeMs, limit, maxFollowSessionDelay){
    if (this.mode === mode.text) {
      log(chalk.blue('Started AutoFollow Period'));
    }
    this.autoFollow(timeMs, limit);

    return setInterval(() => {
      Human.run(maxFollowSessionDelay, 1, () => this.autoFollow(timeMs, limit));
    }, timeMs + maxFollowSessionDelay);
  }

  autoFollow(timeMs, limit){
    this.periodStates.autoFollow = true;
    if (this.mode === mode.text) {
      log(chalk.bold.cyan(` ** Started AutoFollow Session ** `));
    }
    limit = !limit ? this.defaultFollowLimit : limit;

    return new Promise( (resolve, reject) => {
      this.findRelevantMedia(limit).then( res => {
        let users = this.getPotentialUser(res, limit);
        if (this.mode === mode.text) {
          log(chalk.cyan(`AutoFollow with ${users.length} for ${timeMs}ms`));
        }
        resolve(Human.run(timeMs, users.length, id => {
          let user = users[id];
          let lastRun = users.length === id + 1;
          this.follow(user).then( res => {
            if (this.trackFollows) this.autoFollowState.push({
              pk: user.pk,
              username: user.username,
              subTime: _.now()
            });
            this.autoFollowSaveState();
            if (lastRun) this.periodStates.autoFollow = false;
          }).catch(err => {
            if (this.mode === mode.text) { log(chalk.white.bgRed(err.message)); } reject(err);
            if (lastRun) this.periodStates.autoFollow = false;
          });
        }));
      }).catch(reject);
    });
  }

  autoFollowSaveState(){
    if(!this.trackFollows) return;
    jsonfile.writeFileSync(followStateFile, this.autoFollowState);
  }

  autoFollowLoadState(){
    if(!this.trackFollows) return;
    if (!fs.existsSync(followStateFile)) {
      return this.autoFollowSaveState();
    }
    this.autoFollowState = jsonfile.readFileSync(followStateFile);
  }

  getPotentialUser(mediaArr, limit){
    let users = _.map(mediaArr, '_params.user');
    users = users.filter( u => {
      return !u.friendship_status.following && !u.friendship_status.outgoing_request;
    });
    return _.take(users, limit);
  }

  unfollowOld(timeMs){
    return new Promise( (resolve, reject) => {
      let old = this.autoFollowState.filter( info => {
        return _.now() >= info.subTime + timeMs;
      });

      if(old.length === 0){
        if (this.mode === mode.text) {
          log(chalk.red.underline('Nobody to unfollow.'));
        }
        return resolve();
      }

      if (this.mode === mode.text) {
        log(chalk.red.underline('Unfollowing ' + old.length));
      }

      let final = res => {
        this.autoFollowState = this.autoFollowState.filter( info => {
          return res.indexOf(info.pk) === -1;
        });
        this.autoFollowSaveState();
        resolve();
      };

      let deleteTime = old.length * this.unfollowTime;
      let successfulDeleted = [];
      Human.run(deleteTime, old.length, id => {
        let info = old[id];
        this.unfollow(info.pk, info.username).then( () => {
          successfulDeleted.push(info.pk);
          if(id === old.length - 1) final(successfulDeleted);
        }).catch( () => {
          if(err.message && err.message.indexOf('block') > -1){
            if (this.mode === mode.text) {
              log(chalk.white.bgRed(err.message));
            }
          }else{
            successfulDeleted.push(info.mediaId);
          }
          if(id === old.length - 1) final(successfulDeleted);
        });
      });
    });
  }

  //////////////
  // AutoLike //
  //////////////


  autoLikeCleanUpPeriod(timeMs, oldTimeMs){
    if (this.mode === mode.text) {
      log(chalk.blue('Started AutoLike Cleanup Period'));
    }
    let running = true;
    this.unlikeOld(oldTimeMs).then( () => {
      running = false;
    }).catch(() => {
      running = false;
    });

    return setInterval(() => {
      if(running) return;
      running = true;
      this.unlikeOld(oldTimeMs).then( () => {
        running = false;
      }).catch(() => {
        running = false;
      });
    }, timeMs);
  }

  autoLikePeriod(timeMs, limit, maxLikeSessionDelay){
    if (this.mode === mode.text) {
      log(chalk.blue('Started AutoLike Period'));
    }
    this.autoLike(timeMs, limit);

    return setInterval(() => {
      Human.run(maxLikeSessionDelay, 1, () => this.autoLike(timeMs, limit));
    }, timeMs + maxLikeSessionDelay);
  }

  autoLike(timeMs, limit = null){
    this.periodStates.autoLike = true;
    if (this.mode === mode.text) {
      log(chalk.bold.cyan(` ** Started AutoLike Session ** `));
    }
    limit = !limit ? this.defaultLikeLimit : limit;

    return new Promise( (resolve, reject) => {
      this.findRelevantMedia(limit).then( res => {
        let mediaIds = _.take( res , limit);
        if (this.mode === mode.text) {
          log(chalk.cyan(`AutoLike with ${mediaIds.length} for ${timeMs}ms`));
        }
        resolve(Human.run(timeMs, mediaIds.length, id => {
          let media = mediaIds[id];
          let lastRun = mediaIds.length === id + 1;
          this.like(media).then( () => {
            if (this.trackLikes) this.autoLikeState.push({
              mediaId,
              caption,
              likeTime: _.now()
            });
            this.autoLikeSaveState();
            if (lastRun) this.periodStates.autoLike = false;
          }).catch(err => {
            if (this.mode === mode.text) {
              log(chalk.white.bgRed(err.message));
            }
            if (lastRun) this.periodStates.autoLike = false;
            reject(err);
          })
        }));
      }).catch(reject);
    });
  }

  autoLikeSaveState(){
    if(!this.trackLikes) return;
    jsonfile.writeFileSync(likeStateFile, this.autoLikeState);
  }

  autoLikeLoadState(){
    if(!this.trackLikes) return;
    if (!fs.existsSync(likeStateFile)) {
      return this.autoLikeSaveState();
    }
    this.autoLikeState = jsonfile.readFileSync(likeStateFile);
  }

  unlikeOld(timeMs){
    return new Promise( (resolve, reject) => {
      let old = this.autoLikeState.filter( info => {
        return _.now() >= info.likeTime + timeMs;
      });

      if(old.length === 0){
        if (this.mode === mode.text) {
          log(chalk.red.underline('Nothing to unlike.'));
        }
        return resolve();
      }

      if (this.mode === mode.text) {
        log(chalk.red.underline('Unliking ' + old.length));
      }

      let final = res => {
        this.autoLikeState = this.autoLikeState.filter( info => {
          return res.indexOf(info.mediaId) === -1;
        });
        this.autoLikeSaveState();
        resolve();
      };

      let deleteTime = old.length * this.unlikeTime;
      let successfulDeleted = [];
      Human.run(deleteTime, old.length, id => {
        let info = old[id];
        this.unlike(info.mediaId, info.caption).then( () => {
          successfulDeleted.push(info.mediaId);
          if(id === old.length - 1) final(successfulDeleted);
        }).catch( (err) => {
          if(err.message && err.message.indexOf('block') > -1){
            if (this.mode === mode.text) {
              log(chalk.white.bgRed(err.message));
            }
          }else{
            successfulDeleted.push(info.mediaId);
          }
          if(id === old.length - 1) final(successfulDeleted);
        });
      });
    });
  }

  //////////////////////
  // Helper Functions //
  //////////////////////

  getAccount(){
    return this.session.getAccount();
  }

  findRelevantMedia(min = null){
    return new Promise( (resolve, reject) => {
      let maxCalls = this.maxTagsCombined;
      let output = [];
      let tags = [];

      if(!min){
        return this.getNextMedia().then( ({ media, feed }) => {
          resolve(media);
        });
      }

      let addMedia = () => {
        this.getNextMedia().then( ({ media, feed }) => {
          tags.push(feed.tag);
          output.push(...media);

          if(output.length < min && 1 <= maxCalls--){
            return addMedia();
          }

          if (this.mode === mode.text) {
            log(chalk.cyan(` -> ${output.length} relevant Media for ${tags.join(', ')}`));
          }
          return resolve(output);
        });
      }

      addMedia();
    });
  }

  getNextMedia(){
    if(this.lastGotFeed >= this.feeds.length) this.lastGotFeed = 0;
    return new Promise( (resolve, reject) => {
      let feed = this.feeds[this.lastGotFeed++];
      feed.get().then( media => {
        resolve({ media, feed });
      });
    });
  }

  like(media){
    let mediaId = media.id;

    if (this.mode === mode.text) {
      let caption = media._params.caption ? media._params.caption.substr(0, 32).replace(/(\r\n\t|\n|\r\t)/gm,"") : mediaId;
      log(chalk.green.underline('Liked: ' + (info ? info : mediaId)));
    }

    if (this.mode === mode.json) {
      log(this.jsonOutput('liked', { media: media._params }));
    }

    return Client.Like.create(this.session, mediaId);
  }

  unlike(mediaId, info = null){
    if (this.mode === mode.text) {
      log(chalk.red.underline('Unliked: ' + (info ? info : mediaId)));
    }

    if (this.mode === mode.json) {
      log(this.jsonOutput('unliked', { mediaId, info }));
    }

    return Client.Like.destroy(this.session, mediaId);
  }

  follow(user){
    if (this.mode === mode.text) {
      log(chalk.green.underline('Followed: ' + user.username));
    }

    if (this.mode === mode.json) {
      log(this.jsonOutput('followed', { user }));
    }

    return Client.Relationship.create(this.session, user.pk);
  }

  unfollow(accId, info = null){
    if (this.mode === mode.text) {
      log(chalk.red.underline('Unfollowed: ' + (info ? info : accId)));
    }

    if (this.mode === mode.json) {
      log(this.jsonOutput('unfollowed', { accId, info }));
    }

    return Client.Relationship.destroy(this.session, accId);
  }

};
