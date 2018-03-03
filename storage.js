var crypto = require('crypto'),
  algorithm = 'aes-256-ctr',
  password = 'gUZa3TASta&e';

var fs = require('fs');
var zlib = require('zlib');

var filename = 'storage.zip';

// zip content
var zip = zlib.createGzip;
// encrypt content
var encrypt = crypto.createCipher(algorithm, password);
// decrypt content
var decrypt = crypto.createDecipher(algorithm, password);
// unzip content
var unzip = zlib.createGunzip();


exports.read = function () {
  var obj = [];
  try {
    obj = JSON.parse(decrypt(unzip(fs.readFileSync(filename))));
  } catch (e) {
    console.log (e);
  }
  return obj;
};

exports.create = function (server) {
  var servers = exports.read();
  servers.push(server);
  console.log('after create', servers);
  write(servers);
};

var write = function (servers) {
  fs.writeFileSync(filename,encrypt(zip(JSON.stringify(servers))));
};
