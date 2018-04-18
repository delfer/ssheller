const PEM = {
    JUST_ROOT: 'justRoot',
    SUDO_NO_PASSWD: 'sudoNoPasswd',
    SUDO_PASSWD: 'sudoPasswd',
    SU: 'su'
};

exports.runCmd = function (con, command) {
    return exports.runCmdInteractive(con, command);
};

exports.runCmdAsRootMethod = function (con, command, method, forceBreak) {

    var ctrlC = '';
    if (forceBreak) {
        ctrlC = '\x03';
    }

    switch (method) {
        case PEM.JUST_ROOT:
            return exports.runCmd(con, command);
        case PEM.SUDO_NO_PASSWD:
            return exports.runCmd(con, 'sudo -H -i -- sh -c \'' + command.replace(/'/g, '\'') + '\'');
        case PEM.SUDO_PASSWD:
            return exports.runCmdInteractive(con, 'sudo -H -i -- sh -c \'' + command.replace(/'/g, '\'') + '\'', [{
                    regex: /:\s*$/,
                    answer: con.config.password + '\n'
                },
                {
                    regex: /:\s*$/,
                    answer: ctrlC //Ctrl-C for try again
                }
            ]);
        case PEM.SU:
            return exports.runCmdInteractive(con, 'su - -c  \'' + command.replace(/'/g, '\'') + '\'', [{
                    regex: /:\s*$/,
                    answer: con.config.rootPassword + '\n'
                },
                {
                    regex: /:\s*$/,
                    answer: ctrlC //Ctrl-C for try again
                }
            ]);
        default:
            return new Promise(rs, rj => rj);
    }
};

exports.runCmdAsRoot = function (con, command) {
    return detectPrivilegeEscalationMethod(con).then((method) => {
        return exports.runCmdAsRootMethod(con, command, method);
    });
};

exports.runBashScriptAsRoot = function (con, script, args) {
    var script64 = Buffer.from(script, 'binary').toString('base64');

    if (!args) {
        args = '';
    }

    var command = 'echo ' + script64 + ' | base64 -d | /bin/bash /dev/stdin ' + args;

    return rushPackage(con, 'bash')
        .then(() => rushPackage(con, 'base64'))
        .then(() => detectPrivilegeEscalationMethod(con))
        .then((method) => exports.runCmdAsRootMethod(con, command, method));
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
            stream.on('close', function (code) {
                    logCmd(con, command, stdout, stderr);
                    if (code === undefined || code === 0) { // Bugfix: on shutdown code === undefined
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
            exports.runCmdAsRootMethod(con, 'whoami', PEM.SUDO_PASSWD, true)
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
            exports.runCmdAsRootMethod(con, 'whoami', PEM.SU, true)
                .then(function (data) {
                    if (/\s*root\s*/.test(data)) {
                        con.privilegeEscalationMethod = PEM.SU;
                        resolve(con.privilegeEscalationMethod);
                    } else {
                        reject({message: 'Can not get root'});
                    }
                }, () => reject({message: 'Can not get root'}));
        };

        checkJustRoot();
    });
};

var rushPackage = function (con, package) {
    var command = 'which ' + package +
        ' || ( apt-get update && apt-get install -y ' + package + ' )' +
        ' || yum install -y ' + package +
        ' || zypper install -y ' + package +
        ' || urpmi --auto ' + package +
        ' || pacman --noconfirm -Sy ' + package +
        ' || upgradepkg --install-new ' + package +
        ' || apk --no-cache add ' + package;

    return exports.runCmdAsRoot(con, command);
};

var logCmd = function (con, command, out, err) {
    log.debug('com: %s; out: %s; err: %s',
        command, out, err);
};
