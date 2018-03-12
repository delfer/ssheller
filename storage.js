var aesjs = require('aes-js');

var fs = require('fs');
var zlib = require('zlib');

const FILENAME = 'storage.dat';
const PASSWORD = aesjs.utils.utf8.toBytes('7ri+!l3+OEf@afLaHlEq7eN?ezlenieT');


exports.read = function () {
  let obj = [];
  try {
    let aesCtr = new aesjs.ModeOfOperation.ctr(PASSWORD);
    let encrypted = new Uint8Array(fs.readFileSync(FILENAME));
    let zip = aesCtr.decrypt(encrypted);
    let json = zlib.gunzipSync(zip);
    obj = JSON.parse(json);
  } catch (e) {
    if (fs.existsSync(FILENAME)) {
      fs.renameSync(FILENAME,FILENAME+'_broken_'+Date.now());
    }
    console.log(e);
  }
    return obj;
};

exports.create = function (server) {
  var servers = exports.read();
  servers.push(server);
  write(servers);
};

var write = function (servers) {
  let aesCtr = new aesjs.ModeOfOperation.ctr(PASSWORD);
  let json = JSON.stringify(servers);
  let zip = new Uint8Array(zlib.gzipSync(json));
  let encrypted  = aesCtr.encrypt(zip);
  fs.writeFileSync(FILENAME,encrypted);
};
