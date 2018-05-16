var sshell = require('../sshell');
var fs = require('fs');
const path = require('path');

var script;

fs.readFile(path.join(__dirname, '../scripts/openvpn-install.sh'), 'utf8', function (err, out) {
    if (!err && out) {
        script = out.replace('SUDO_USER', 'NOSUDO_USER');
    }
});

var plugin = {};
var con;
var refresher;

var uiCallback;

var state = {
    report: {}
};

exports.name = 'OpenVPN';

var osSupportList = [{
        name: "Centos",
        version: ["6", "7"]
    },
    {
        name: "Fedora",
        version: ["25", "26", "27", "28"]
    },
    {
        name: "Debian",
        version: ["7", "8", "9"]
    },
    {
        name: "Ubuntu",
        version: ["14.04", "16.04", "17.10", "18.04"]
    },
    {
        name: "Arch Linux"
    }
];


exports.getView = function () {
    var osWidget = widgets.os.getView(osSupportList);
    return `
        <!-- OS -->
        ${osWidget}

        <!-- Status -->
        <div id='statusDiv' class="alert" role="alert">
            Loading...
        </div>

        <!-- Installation progress Bar -->
        <div id="progressBar" class="progress bg-secondary m-2 d-none">
            <div id="progressContent" class="progress-bar progress-bar-striped progress-bar-animated bg-success" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">Installation...</div>
        </div>

        <!-- (un)install buttons -->
        <div>
            <button id="installBtn" type="button" class="btn btn-success disabled" onClick="install()">Install</button>
            <button id="uninstallBtn" type="button" class="btn btn-danger disabled" onClick="uninstall()">Uninstall</button>
        </div>

        <!-- Clients -->
        <div id="clientsDiv" class="mt-2 p-0 container d-none">
        <div class="card">
        <div class="card-body">
            <h5 class="card-title">Download <b>.ovpn</b> file</h5>
            <div id="clientsList" class="card-text">Loading...</div>
        </div>
        </div>
            <form class="form-inline" onsubmit="javascript:addClinet();return false;">
                <div class="form-group">
                    <input type="text" class="form-control" id="newClientName" placeholder="New client name">
                </div>
                <button type="button" class="btn btn-primary" onClick="addClinet()">Add</button>
            </form>
        </div>

        <hr/>

        <!-- Credits -->
        <div class="card mt-4">
            <div class="card-header">
                <a class="card-link" data-toggle="collapse" href="#collapseCredits">
                Credits
                </a>
            </div>
            <div id="collapseCredits" class="collapse">
                <div class="card-body">
                Based on <a class='ext' href='https://github.com/Angristan/OpenVPN-install'>OpenVPN-install by Angristan</a><br/>
                which forked from <a class='ext' href='https://github.com/Nyr/openvpn-install'>OpenVPN-install by Nyr</a>
                </div>
            </div>
        </div>

        <script>
        function pluginViewRefreshCallback (state) {
            var statusText;
            var statusClass;
            if (state.internalError) {
                statusText = 'An error occurred, see the log file';
                statusClass = 'alert-danger';
                $('#installBtn').addClass("disabled");
                $('#uninstallBtn').addClass("disabled");
            } else if (state.installationInProgress) {
                statusText = 'Please, wait for about <b>15</b> minutes. OpenVPN installation in progress...';
                statusClass = 'alert-warning';
                $('#installBtn').addClass("disabled");
                $('#uninstallBtn').addClass("disabled");
            } else if (state.uninstallationInProgress) {
                statusText = 'OpenVPN uninstallation in progress...';
                statusClass = 'alert-warning';
                $('#installBtn').addClass("disabled");
                $('#uninstallBtn').addClass("disabled");
            }else if (state.installed) {
                statusText = 'OpenVPN installed and ready for use';
                statusClass = 'alert-success';
                $('#installBtn').addClass("disabled");
                $('#uninstallBtn').removeClass("disabled");
            }  else if (state.osNotSupported) {
                statusText = 'Sorry, ' + state.osName + ' is not supported yet';
                statusClass = 'alert-danger';
                $('#installBtn').addClass("disabled");
                $('#uninstallBtn').addClass("disabled");
            } else if (state.readyToInstall) {
                statusText = 'OpenVPN ready to install';
                statusClass = 'alert-primary';
                $('#installBtn').removeClass("disabled");
                $('#uninstallBtn').addClass("disabled");
            };

            $('#statusDiv').removeClass();
            $('#statusDiv').addClass('alert');
            $('#statusDiv').addClass(statusClass);
            $('#statusDiv').html(statusText);
            
            if (state.installationInProgress) {
                var currentTime = new Date().getTime();
                var currentProgress = (currentTime - state.startTime)*100/(15*60*1000); // % of 15 minutes
                currentProgress = Math.round(currentProgress) % 100; // Not > 100%

                $("#progressContent")
                    .css("width", currentProgress + "%")
                    .attr("aria-valuenow", currentProgress);

                $('#progressBar').removeClass('d-none');
            } else {
                $('#progressBar').addClass('d-none');
            }

            if (state.installed) {
                $('#clientsDiv').removeClass('d-none');

                var $list = $('#clientsList');
                $list.empty();
                $.each(state.clients, function () {
                    $list.append($('<a href="#" onclick="getFile(\\'' + this + '\\');" class="badge badge-info m-1">').text(this));
                });
            } else {
                $('#clientsDiv').addClass('d-none');
            }

            if (state.report && state.report.takeFile) {
                saveAs(state.report.takeFile.body,state.report.takeFile.name);
                pluginInterract({gotReport: true});
            }
        };

        function install () {
            if (!$('#installBtn').hasClass("disabled")) {
                pluginInterract({install: true});
            }
        };

        function uninstall () {
            if (!$('#uninstallBtn').hasClass("disabled")){
                pluginInterract({uninstall: true});
            }
        };

        function addClinet () {
            pluginInterract({newClientName: $('#newClientName').val()});
        };

        function getFile (fileN) {
            pluginInterract({getFile: fileN});
        };

        function saveAs(base64, filename) {
            var link = document.createElement('a');
            link.href = 'data:application/octet-stream;base64,' + base64;
            link.download = filename;

            //Firefox requires the link to be in the body
            document.body.appendChild(link);

            //simulate click
            link.click();

            //remove the link when done
            document.body.removeChild(link);
        }

        pluginInterract({refresh: true});
        </script>
    `;
};

exports.setViewRefreshCallback = function (callback) {
    uiCallback = function () {
        callback(state, exports.name);
    };
};

exports.setSSHConnection = function (ssh) {
    con = ssh;
    // Reset state
    state = {
        report: {}
    };
    widgets.os.init(con)
        .then(s => {
            state.osName = s;
        });
    getStatus();
    getClients();
};

exports.interract = function (request) {
    if (request.install) {
        installOpenVPN();
    } else if (request.uninstall) {
        uninstallOpenVPN();
    } else if (request.newClientName) {
        addNewClient(request.newClientName);
    } else if (request.getFile) {
        getFile(request.getFile);
    } else if (request.gotReport) {
        state.report = {};
    } else if (request.refresh) {
        uiCallback();
    }
};

exports.reset = function () {};

var refreshData = function () {
    uiCallback();
    if (!state.installationInProgress) {
        clearInterval(refresher);
    }
};

var getStatus = () => {
    var statusScript = script.replace(/^\s*read .*$/mg, 'exit');

    sshell.runBashScriptAsRoot(con, statusScript).then(s => {
        if (/I need to know the IPv4 address/i.test(s)) {
            state.readyToInstall = true;
        } else if (/is not supported/i.test(s) ||
            /Looks like you aren't running this installer on/i.test(s)) {
            state.osNotSupported = true;
        } else if (/Looks like OpenVPN is already installed/i.test(s)) {
            state.installed = true;
        }
        uiCallback();
    }, (s) => {
        state.internalError = true;
        uiCallback();
    });
};

var installOpenVPN = () => {
    var installScript = script.
    replace(/^\s*read.*-i\s+([^\s]+)\s+(CONTINUE)$/mg, '$2="$1"; echo "$$$2"'). //Continue update in Arch Linux
    replace(/^\s*read.*(CONTINUE)$/mg, '$1="n"; echo "$$$1"'). //Do not continue on unsupported OS
    replace(/^\s*read.*(option)/mg, '$1="4"; echo "$$$1"'). //Select option 4 to be soure while installing
    replace(/^\s*read.*-i\s+([^\s]+)\s+([^\s]+)/mg, '$2="$1"; echo "$$$2"'). //Everywhere use default settings
    replace(/^\s*read.+Press any key.*$/mg, ''). //Never wait for pressing any key
    replace(/^\s*read.+(USEREXTERNALIP)/mg, '$1="' + con.config.host + '"; echo "$$$1"'); //Use host from SSH connection if needed

    state.installationInProgress = true;
    state.readyToInstall = false;

    refresher = setInterval(refreshData, 1000);

    state.startTime = new Date().getTime();

    return sharedScripts.install_package(con, 'curl')
        .then(() => sshell.runBashScriptAsRoot(con, installScript))
        .then((s) => {
            openModal (
                'OpenVPN installation successed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );

            state.installationInProgress = false;
            getStatus();
            getClients();
        })
        .catch(s => {
            openModal (
                'OpenVPN installation failed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );

            state.installationInProgress = false;
            getStatus();
        });
};


var uninstallOpenVPN = function () {
    var uninstallScript = script.
    replace(/^\s*read.*(option)/mg, '$1="3"; echo "$$$1"'). // Select option 3 to remove OpenVPN
    replace(/^\s*read.*(REMOVE)/mg, '$1="y"; echo "$$$1"'); // Yes, remove

    state.uninstallationInProgress = true;
    state.installed = false;
    uiCallback();

    sshell.runBashScriptAsRoot(con, uninstallScript)
        .then(s => {
            openModal (
                'OpenVPN uninstallation successed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );

            state.uninstallationInProgress = false;
            getStatus();
        }, s => {
            openModal (
                'OpenVPN uninstallation failed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );

            state.uninstallationInProgress = false;
            getStatus();
        });
};

var addNewClient = name => {
    var addClientScript = script.
    replace(/^\s*read.*(option)/mg, '$1="1"; echo "$$$1"'). // Select option 1 to add new client
    replace(/^\s*read.*(CLIENT)/mg, '$1="' + name + '"; echo "$$$1"'); // New clint's name

    return sshell.runBashScriptAsRoot(con, addClientScript)
        .then(getClients, getClients);
};

var getClients = () => {
    sshell.runCmdAsRoot(con, "ls *.ovpn | cat")
        .then(s => {
            state.clients = s.trim().split(/\s*[\r\n]+\s*/g);
            state.clients = state.clients.filter((s) => {
                return !s.includes(':');
            });
            uiCallback();
        })
        .catch(uiCallback);
};

var getFile = file => {
    sshell.runCmdAsRoot(con, "echo \"|\"; cat \"" + file + "\" | base64; echo \"|\"")
        .then(s => {
            s = s.replace(/[\r\n]/g, '');
            var base64 = /\|((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)\|/.exec(s)[1];
            state.report.takeFile = {
                name: file,
                body: base64
            };
            uiCallback();
        })
        .catch(uiCallback);
};
