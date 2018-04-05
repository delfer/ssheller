const PEM = {
    JUST_ROOT: 'justRoot',
    SUDO_NO_PASSWD: 'sudoNoPasswd',
    SUDO_PASSWD: 'sudoPasswd',
    SU: 'su'
};

exports.runCmd = function (con, command) {
    return exports.runCmdInteractive(con, command);
};

exports.runCmdAsRootMethod = function (con, command, method) {
    switch (method) {
        case PEM.JUST_ROOT:
            return exports.runCmd(con, command);
        case PEM.SUDO_NO_PASSWD:
            return exports.runCmd(con, 'sudo ' + command);
        case PEM.SUDO_PASSWD:
            return exports.runCmdInteractive(con, 'sudo ' + command, [{
                    regex: /:\s*$/,
                    answer: con.config.password + '\n'
                },
                {
                    regex: /:\s*$/,
                    answer: '\x03' //Ctrl-C for try again
                }
            ]);
        case PEM.SU:
            return exports.runCmdInteractive(con, 'su -c ' + command, [{
                    regex: /:\s*$/,
                    answer: con.config.rootPassword + '\n'
                },
                {
                    regex: /:\s*$/,
                    answer: '\x03' //Ctrl-C for try again
                }
            ]);
        default:
            return new Promise(rs, rj => rj);
    }
};

exports.runCmdAsRoot = function (con, command) {
    return new Promise(function (resolve, reject) {
        detectPrivilegeEscalationMethod(con).then(function (method) {
            exports.runCmdAsRootMethod(con, command, method).then(resolve, reject);
        }, reject);
    });
};

exports.runCmdInteractive = function (con, command, reactions) {
    var stdout = '';
    var stderr = '';
    var reactionN = 0;
    return new Promise(function (resolve, reject) {
        con.exec(command, {
            pty: reactions != undefined
        }, function (err, stream) {
            if (err) {
                logCmd(con, command, undefined, err);
                reject(err);
                return;
            }
            stream.on('close', function () {
                    logCmd(con, command, stdout, stderr);
                    if (stderr.length === 0) {
                        resolve(stdout);
                    } else {
                        reject(stderr);
                    }
                })
                .on('data', function (data) {
                    stdout += data;
                    if (reactions && reactionN < reactions.length) {
                        if (reactions[reactionN].regex.test(data)) {
                            stream.write(reactions[reactionN].answer);
                            reactionN++;
                        }
                    }
                }).stderr.on('data', function (data) {
                    stderr += data;
                });
        });
    });
};

var detectPrivilegeEscalationMethod = function (con) {
    return new Promise(function (resolve, reject) {
        if (con.privilegeEscalationMethod) {
            resolve(con.privilegeEscalationMethod);
            return;
        }

        //Already root
        var checkJustRoot = function () {
            exports.runCmdAsRootMethod(con, 'whoami', PEM.JUST_ROOT)
            .then(function (data) {
                if (/\s*root\s*/.test(data)) {
                    con.privilegeEscalationMethod = PEM.JUST_ROOT;
                    resolve(con.privilegeEscalationMethod);
                } else {
                    checkSudoNoPasswd();
                }
            }, checkSudoNoPasswd);
        };

        //Sudo without password
        var checkSudoNoPasswd = function () {
            exports.runCmdAsRootMethod(con, 'whoami', PEM.SUDO_NO_PASSWD)
            .then(function (data) {
                if (/\s*root\s*/.test(data)) {
                    con.privilegeEscalationMethod = PEM.SUDO_NO_PASSWD;
                    resolve(con.privilegeEscalationMethod);
                } else {
                    checkSudoPasswd();
                }
            }, checkSudoPasswd);
        };

        //Sudo with password
        var checkSudoPasswd = function () {
            exports.runCmdAsRootMethod(con, 'whoami', PEM.SUDO_PASSWD)
            .then(function (data) {
                if (/\s*root\s*/.test(data)) {
                    con.privilegeEscalationMethod = PEM.SUDO_PASSWD;
                    resolve(con.privilegeEscalationMethod);
                } else {
                    checkSu();
                }
            }, checkSu);
        };

        //Su
        var checkSu = function () {
            exports.runCmdAsRootMethod(con, 'whoami', PEM.SU)
            .then(function (data) {
                if (/\s*root\s*/.test(data)) {
                    con.privilegeEscalationMethod = PEM.SU;
                    resolve(con.privilegeEscalationMethod);
                } else {
                    reject();
                }
            }, reject);
        };

        checkJustRoot();
    });
};

var logCmd = function (con, command, out, err) {
    log.debug('com: %s; out: %s; err: %s',
        command, out, err);
};