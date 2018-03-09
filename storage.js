var crypto = require('crypto'),
  algorithm = 'aes-256-ctr',
  password = '7ri+!l3+OEf@afLaHlEq7eN?ezlenieT';

var toStream = require('string-to-stream'),
  toString = require('stream-to-string');

var aesjs = require('aes-js');

var fs = require('fs');
var zlib = require('zlib');

var filename = 'storage.zip';

var iv = new Buffer.alloc(16);

// zip content
var zip = zlib.createGzip();
// encrypt content
var encrypt = crypto.createCipher(algorithm, password);
// decrypt content
var decrypt = crypto.createDecipher(algorithm, password);
// unzip content
var unzip = zlib.createGunzip();


exports.read = function () {
  let obj = [];
  // let file = fs.createReadStream(filename);
  // let stream = file.pipe(decrypt).pipe(unzip);
  // toString(stream).then(function (msg) {
  //   console.log(msg);
  //   obj = JSON.parse(msg);
  //   file.close();
  // }, function(rsn) { console.log(rsn);});
  try {
    let aesCtr = new aesjs.ModeOfOperation.ctr(aesjs.utils.utf8.toBytes(password));
    let encrypted = new Uint8Array(fs.readFileSync(filename));
    console.log('read-enc',encrypted);
    let zipped = aesCtr.decrypt(encrypted);
    let decryptedText = aesjs.utils.utf8.fromBytes(zipped);
    console.log('read-json',decryptedText);
    obj = JSON.parse(decryptedText);
  } catch (e) {
    console.log(e);
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
  // let file = fs.createWriteStream(filename);
  // await toStream(JSON.stringify(servers)).pipe(zip).pipe(encrypt).pipe(file).
  // file.close();
  let aesCtr = new aesjs.ModeOfOperation.ctr(aesjs.utils.utf8.toBytes(password));
  let json = JSON.stringify(servers);
  console.log('wrtie-json',json);
  let textBytes = aesjs.utils.utf8.toBytes(json);
  let encrypted  = aesCtr.encrypt(textBytes);
  console.log('wrtie-enc',encrypted);
  fs.writeFileSync(filename,encrypted);
};
