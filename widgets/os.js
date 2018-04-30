var sshell = require('../sshell');

var osName;

var widget = {
    init: con => {
        return new Promise((resolve, reject) => {
            sshell.runCmd(con, 'cat /etc/*-release').then(res => {
                var pretty = res.toString().match(/PRETTY_NAME="(.+)"/);
                if (pretty) {
                    osName = pretty[1];
                } else {
                    var description = res.toString().match(/DISTRIB_DESCRIPTION="(.+)"/);
                    if (description) {
                        osName = description[1];
                    } else {
                        osName = res.toString();
                    }
                }
                resolve(osName);
            }, reject);
        });
    },

    isSupported: false,

    getView: list_ => {
        var list = JSON.parse(JSON.stringify(list_)); //Deep copy

        // OS check
        list.forEach(os => {
            var re = new RegExp(os.name, 'i');
            if (re.test(osName)) {
                os.supported = true;
                if (os.version && os.version.length > 0) {
                    os.version.forEach(v => {
                        re = new RegExp(v, 'i');
                        if (re.test(osName)) {
                            os.supportedVersion = v;
                        }
                    });
                }
            }
        });

        //UI build
        widget.isSupported = false;
        var ui = `<p class="container text-muted p-0">
                    <label>Supported OS:</label><br>`;
        list.forEach((os, num) => {
            var c = '';
            if (
                (os.supported && os.version && os.version.length > 0 && os.supportedVersion) ||
                (os.supported && os.version && os.version.length === 0) ||
                (os.supported && !os.version)
            ) {
                widget.isSupported = true;
                c = ' badge-success';
            } else if (os.supported) {
                c = ' badge-danger';
            }
            ui += '<label class="badge' + c + '">' + os.name + '</label>';

            if (os.version && os.version.length > 0) {
                os.version.forEach(v => {
                    if (os.supported && v === os.supportedVersion) {
                        c = ' badge-success';
                    } else {
                        c = '';
                    }
                    ui += '<label class="badge' + c + '">' + v + '</label>';
                });
            }

            if (num != (list.length - 1)) {
                if (num % 2 === 1) {
                    ui += '<br>';
                } else {
                    ui += '| ';
                }
            }
        });

        if (!widget.isSupported) {
            if (list.length % 2 === 0) {
                ui += '<br>';
            } else {
                ui += '| ';
            }

            if (!osName || osName.length < 1) {
                osName = 'Unknown';
            }
            ui += '<label class="badge badge-danger">' + osName.split(/\s+/).slice(0, 3).join(' ').substr(0, 32) + '</label>';
        }

        ui += `</p>`;
        return ui;
    }
};

exports.load = widgets => {
    widgets.os = widget;
};
