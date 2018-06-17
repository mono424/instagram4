const Ig4Remote = require('./classes/Ig4Remote');
var { server:serverConfig } = require('./config');
let remote = new Ig4Remote(serverConfig);

remote.start().then( () => {
  remote.ig4Start();
  console.log(`🔥🔥🔥 ig4 server is all fired up!`);
  console.log(`🔥🔥🔥 running on port ${serverConfig.port}`);
});
