const PEM = {
    JUST_ROOT: 'justRoot',
    SUDO_NO_PASSWD: 'sudoNoPasswd',
    SUDO_PASSWD: 'sudoPasswd',
    SU: 'su'
};

exports.runCmd = (con, command) => exports.runCmdInteractive(con, command);

exports.runCmdAsRootMethod = (con, command, method, forceBreak) => {

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
            return new Promise((rs, rj) => rj);
    }
};

exports.runCmdAsRoot = (con, command) => {
    return detectPrivilegeEscalationMethod(con)
        .then(method =>
            exports.runCmdAsRootMethod(con, command, method)
        )
        .catch((e) => Promise.reject(e));
};

exports.runBashScriptAsRoot = (con, script, args) => {
    var script64 = Buffer.from(script, 'binary').toString('base64');

    if (!args) {
        args = '';
    }

    var command = 'echo ' + script64 + ' | base64 -d | /bin/bash /dev/stdin ' + args;

    return rushPackage(con, 'bash')
        .then(() => rushPackage(con, 'base64'))
        .then(() => detectPrivilegeEscalationMethod(con))
        .then(method => exports.runCmdAsRootMethod(con, command, method))
        .catch((e) => (e) => Promise.reject(e));
};


exports.runCmdInteractive = (con, command, reactions) => {
    var stdout = '';
    var stderr = '';
    var reactionN = 0;
    return new Promise((resolve, reject) => {

        var makeTry = () => {
            var isSuccessful = con.exec(command, {
                pty: true
            }, (err, stream) => {
            if (err) {
                    if (/open fail/i.test(err)) {
                        log.error('Exec failed with ' + err);
                        con.end();
                    }
                    logCmd(con, command, undefined, undefined, err);
                reject(err);
                return;
            }
                stream.on('close', code => {
                        logCmd(con, command, code, stdout, stderr);
                        if (code === undefined || code === 0) { // Bugfix: on shutdown, code === undefined
                        resolve(stdout);
                    } else {
                            if ((!stderr || stderr.length < 1) && stdout && stdout.length > 0) {
                                reject('Exit code: ' + code + '\n' + stdout);
                    }
                            reject('Exit code: ' + code + '\n' + stderr);
                        }
                })
                    .on('data', data => {
                    stdout += data;
                    if (reactions && reactionN < reactions.length) {
                        if (reactions[reactionN].regex.test(data)) {
                            stream.write(reactions[reactionN].answer);
                            reactionN++;
                            } else if (reactions[reactionN].optional) {
                                // If current answer optional -> find first required
                                for (i = reactionN + 1; i < reactions.length; i++) {
                                    if (reactions[i].regex.test(data)) {
                                        stream.write(reactions[i].answer);
                                        reactionN = i + 1;
                                        break;
                                    } else if (reactions[i].optional) {
                                        continue;
                                    } else {
                                        break;
                                    }
                                }
                        }
                    }
                    }).stderr.on('data', data => {
                    stderr += data;
                });
        });

            if (!isSuccessful) {
                con.on('continue', makeTry);
            }
        };

        makeTry();

    });
};

var detectPrivilegeEscalationMethod = con => {
    return new Promise((resolve, reject) => {
        if (con.privilegeEscalationMethod) {
            resolve(con.privilegeEscalationMethod);
            return;
        }

        //Already root
        var checkJustRoot = () => {
            exports.runCmdAsRootMethod(con, 'whoami', PEM.JUST_ROOT)
                .then(data => {
                    if (/\s*root\s*/.test(data)) {
                        con.privilegeEscalationMethod = PEM.JUST_ROOT;
                        resolve(con.privilegeEscalationMethod);
                    } else {
                        checkSudoNoPasswd();
                    }
                }, checkSudoNoPasswd);
        };

        //Sudo without password
        var checkSudoNoPasswd = () => {
            exports.runCmdAsRootMethod(con, 'whoami', PEM.SUDO_NO_PASSWD)
                .then(data => {
                    if (/\s*root\s*/.test(data)) {
                        con.privilegeEscalationMethod = PEM.SUDO_NO_PASSWD;
                        resolve(con.privilegeEscalationMethod);
                    } else {
                        checkSudoPasswd();
                    }
                }, checkSudoPasswd);
        };

        //Sudo with password
        var checkSudoPasswd = () => {
            exports.runCmdAsRootMethod(con, 'whoami', PEM.SUDO_PASSWD, true)
                .then(data => {
                    if (/\s*root\s*/.test(data)) {
                        con.privilegeEscalationMethod = PEM.SUDO_PASSWD;
                        resolve(con.privilegeEscalationMethod);
                    } else {
                        checkSu();
                    }
                }, checkSu);
        };

        //Su
        var checkSu = () => {
            exports.runCmdAsRootMethod(con, 'whoami', PEM.SU, true)
                .then(data => {
                    if (/\s*root\s*/.test(data)) {
                        con.privilegeEscalationMethod = PEM.SU;
                        resolve(con.privilegeEscalationMethod);
                    } else {
                        reject({
                            message: 'Can not get root'
                        });
                    }
                }, () => reject({
                    message: 'Can not get root'
                }));
        };

        checkJustRoot();
    });
};

var rushPackage = (con, package) => {
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
