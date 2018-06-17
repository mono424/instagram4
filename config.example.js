module.exports = {

  // Server
  server: {
    port: 8080
  },

  // Related Tags
  tags: [
    "picoftheday",
    "like4like",
    "follow4follow"
  ],

  // Enable Track & Auto Delete Duration
  trackLikes: true,
  trackFollows: true,
  followDuration: 6 * 60 * 60 * 1000,
  likeDuration: 2 * 60 * 60 * 1000,

  // Max Delayed Time for each delete request for more human delete actions
  unfollowTime: 5000,
  unlikeTime: 20000,

  // Display of Status
  statusRate: 3 * 60 * 1000,

  // Like & Follow Session Settings
  sessionDuration: 30 * 60 * 1000,
  maxLikesPerSession: 60,
  maxFollowsPerSession: 4, /* keep this low to avoid getting banned ! */
  maxTagsCombined: 10,

  // Max Session Delays
  maxFollowSessionDelay: 2 * 60 * 60 * 1000,
  maxLikeSessionDelay: 2 * 60 * 60 * 1000,

  // Start Delay
  startLikeDelay: 5 * 1000,
  startFollowDelay: 24 * 60 * 60 * 1000,
};
