var aesjs = require('aes-js');

var fs = require('fs');
var zlib = require('zlib');

const FILENAME = 'storage.dat';
const PASSWORD = aesjs.utils.utf8.toBytes('7ri+!l3+OEf@afLaHlEq7eN?ezlenieT');

exports.read = function () {
  var data = {};
  try {
    let aesCtr = new aesjs.ModeOfOperation.ctr(PASSWORD);
    let encrypted = new Uint8Array(fs.readFileSync(FILENAME));
    let zip = aesCtr.decrypt(encrypted);
    let json = zlib.gunzipSync(zip);
    data = JSON.parse(json);
  } catch (e) {
    if (fs.existsSync(FILENAME)) {
      fs.renameSync(FILENAME, FILENAME + '_broken_' + Date.now());
    }
  }
  return data;
};

exports.readServers = function () {
  var data = exports.read();

  let servers = [];

  if (data && data.servers) {
    servers = data.servers;
  }

  return servers;
};

exports.createServer = function (server) {
  exports.deleteServer(server);
  var servers = exports.readServers();
  servers.push(server);
  writeServers(servers);
};

exports.deleteServer = function (server) {
  if (!server.name) {
    return;
  }

  var servers = exports.readServers()
    .filter(function (s) {
      return (s.name !== server.name);
    });

  writeServers(servers);
};

var write = function (data) {
  let aesCtr = new aesjs.ModeOfOperation.ctr(PASSWORD);
  let json = JSON.stringify(data);
  let zip = new Uint8Array(zlib.gzipSync(json));
  let encrypted = aesCtr.encrypt(zip);
  fs.writeFileSync(FILENAME, encrypted);
};

var writeServers = function (servers) {
  var data = exports.read();
  data.servers = servers;
  write(data);
};
