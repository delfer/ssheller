exports.runOnce = function (con, command) {
    return new Promise(function (resolve, reject) {
        con.exec(command, function (err, stream) {
            if (err) throw err;
            stream.on('data', function (data) {
                logCmd(con, command,data);
                resolve(data);
            }).stderr.on('data', function (data) {
                logCmd(con, command,undefined,data);
                reject(data);
            });
        });
    });
};

var logCmd = function (conn, command, out, err) {
    log.debug ('Con: %s; com: %s; out: %s; err: %s', CircularJSON.stringify(conn).replace(/"password":".*"/g,'"password":"XXX"'), command, out, err);
};
