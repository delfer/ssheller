exports.runOnce = function (con, command) {
    var res = '';
    return new Promise(function (resolve, reject) {
        con.exec(command, function (err, stream) {
            if (err) {
                logCmd(con, command,undefined,err);
                reject(err);
                return;
            }
            stream.on('close', function () {
                logCmd(con, command,res);
                resolve(res);
            })
            .on('data', function (data) {
                res += data;
            }).stderr.on('data', function (data) {
                logCmd(con, command,undefined,data);
                reject(data);
            });
        });
    });
};

var logCmd = function (conn, command, out, err) {
    log.debug('Con: %s; com: %s; out: %s; err: %s', CircularJSON.stringify(conn).replace(/"password":".*"/g, '"password":"XXX"'), command, out, err);
};