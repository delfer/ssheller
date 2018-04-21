var aesjs = require('aes-js');

var electron = require('electron');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const FILE_PATH = path.join(userDataPath, 'storage.dat');
const PASSWORD = aesjs.utils.utf8.toBytes('7ri+!l3+OEf@afLaHlEq7eN?ezlenieT');

exports.read = function () {
  var data = {};
  try {
    let aesCtr = new aesjs.ModeOfOperation.ctr(PASSWORD);
    let encrypted = new Uint8Array(fs.readFileSync(FILE_PATH));
    let zip = aesCtr.decrypt(encrypted);
    let json = zlib.gunzipSync(zip);
    data = JSON.parse(json);
  } catch (e) {
    if (fs.existsSync(FILE_PATH)) {
      fs.renameSync(FILE_PATH, FILE_PATH + '_broken_' + Date.now());
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
  fs.writeFileSync(FILE_PATH, encrypted);
};

var writeServers = function (servers) {
  var data = exports.read();
  data.servers = servers;
  write(data);
};
