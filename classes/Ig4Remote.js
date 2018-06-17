const fs = require('fs');
const Hapi = require('hapi');
const { spawn } = require('child_process');

module.exports = class Ig4Remote {

  constructor({ port = 3000 } = {}) {
    this.port = port;
    this.status = "stopped";
    this.log = [];
    this.ig4 = null;
    this.logLineLength = 400;
  }

  async start() {
    this.server = Hapi.server({
        port: this.port
    });

    this.server.route({
        method: 'GET',
        path: '/',
        handler: (...args) => this.route_status(...args)
    });

    this.server.route({
        method: 'GET',
        path: '/log',
        handler: (...args) => this.route_log(...args)
    });

    this.server.route({
        method: 'GET',
        path: '/stop',
        handler: (...args) => this.route_stop(...args)
    });

    this.server.route({
        method: 'GET',
        path: '/start',
        handler: (...args) => this.route_start(...args)
    });

    this.server.route({
        method: 'GET',
        path: '/clear-cookie',
        handler: (...args) => this.route_clearCookie(...args)
    });

    await this.server.start();
  }

  ig4Start() {
    this.ig4 = spawn('node', ['app.js']);
    this.ig4.stdout.on('data', (...args) => this.handleIg4Data(...args));
    this.ig4.stderr.on('data', (...args) => this.handleIg4Error(...args));
    this.ig4.on('close', (...args) => this.handleIg4Close(...args));
    this.status = "started";
  }

  ig4Stop() {
    if (this.ig4) this.ig4.kill('SIGHUP');
  }

  handleIg4Data(data) {
    this.addToIg4Log(data, "data");
  }

  handleIg4Error(error) {
    this.addToIg4Log(error, "error");
  }

  handleIg4Close(code) {
    this.addToIg4Log(`ended with code: ${code}`);
    this.status = "stopped";
  }

  addToIg4Log(data, type = "data") {
    this.log.push({ data, type });
    while (this.log.length > this.logLineLength) {
      this.log.shift();
    }
  }

  route_status(request, h) {
    return this.status;
  }

  route_log(request, h) {
    return "<ol>" + this.log.map( item => `<li>${item.data}<li>` ).join('\n') + "</ol>";
  }

  route_start(request, h) {
    this.ig4Start();
    return "ok";
  }

  route_stop(request, h) {
    this.ig4Stop();
    return "ok";
  }

  route_clearCookie(request, h) {
    fs.unlinkSync('./data/cookies/user.json');
    return "ok";
  }

}
