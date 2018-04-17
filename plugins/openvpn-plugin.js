var sshell = require('../sshell');
var fs = require('fs');

var script = fs.readFileSync('scripts/openvpn-install.sh', 'UTF-8').replace('SUDO_USER','NOSUDO_USER');

var plugin = {};
var con;
var refresher;

var uiCallback;

var state = {report: {}};

plugin.name = 'OpenVPN';

plugin.getView = function () {
    return `
        <!-- OS -->
        <p class="container text-muted p-0">
            <label>Supported OS:</label><br>
            <label id="os-d" class="badge">Debian</label>
                <label id="os-d7" class="badge">7</label>
                <label id="os-d8" class="badge">8</label>
                <label id="os-d9" class="badge">9</label> |
            <label id="os-u" class="badge">Ubuntu</label>
                <label id="os-u1404" class="badge">14.04</label>
                <label id="os-u1604" class="badge">16.04</label>
                <label id="os-u1710" class="badge">17.10</label> <br>
            <label id="os-f" class="badge">Fedora</label>
                <label id="os-f25" class="badge">25</label>
                <label id="os-f26" class="badge">26</label>
                <label id="os-f27" class="badge">27</label> |
            <label id="os-c" class="badge">CentOS</label>
                <label id="os-c6" class="badge">6</label>
                <label id="os-c7" class="badge">7</label> |
            <label id="os-a" class="badge">Arch Linux</label>
        </p>

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
            if (state && state.osFamaly) {
                $('#os-' + state.osFamaly).addClass("badge-success");
                $('#os-' + state.osFamaly + state.osVersion).addClass("badge-success");
            }

            var statusText;
            var statusClass;
            if (state.internalError) {
                statusText = 'An error occurred, see the log file';
                statusClass = 'alert-danger';
                $('#installBtn').addClass("disabled");
                $('#uninstallBtn').addClass("disabled");
            } else if (state.installationInProgress) {
                statusText = 'Please, wait for about <b>10</b> minutes. OpenVPN installation in progress...';
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
                var currentProgress = (currentTime - state.startTime)*100/(10*60*1000); // % of 10 minutes
                currentProgress = Math.round(currentProgress) % 100; // Not > 100%

                $("#progressContent")
                    .css("width", currentProgress + "%")
                    .attr("aria-valuenow", currentProgress);

                $('#progressBar').removeClass('d-none');
            } else {
                $('#progressBar').addClass('d-none');
            }

            if (state.report && state.report.success && state.report.text) {
                    var status = state.report.success ? 'successed!' : 'failed!'; 
                    $('#mainModalLabel').html('OpenVPN (un)installation ' + status);
                    $('#mainModalBody').html('<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + state.report.text + '</textarea>');
                    $('#mainModal').modal('show');

                    pluginInterract({gotReport: true});
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

            if (state.report.takeFile) {
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

plugin.setViewRefreshCallback = function (callback) {
    uiCallback = function () {
        callback(state, plugin.name);
    };
};

plugin.setSSHConnection = function (ssh) {
    con = ssh;
    // Reset state
    state = {report: {}};
    detectOS();
    getStatus();
    getClients();
};

plugin.interract = function (request) {
    if (request.install) {
        installOpenVPN();
    } else if (request.uninstall) {
        uninstallOpenVPN();
    } else if (request.newClientName) {
        addNewClient(request.newClientName);
    } else if (request.getFile) {
        getFile(request.getFile);
    }  else if (request.gotReport) {
        state.report = {};
    } else if (request.refresh) {
        uiCallback();
    }
};

plugin.reset = function () {
};

exports.plugin = function (list, loader) {
    list.push(plugin);
};

var requestData = function () {
    uiCallback();
};

var detectOS = function () {
    sshell.runCmd(con, 'cat /etc/*-release').then((res) => {
        var pretty = res.toString().match(/PRETTY_NAME="(.+)"/);
        if (pretty) {
            state.osName = pretty[1];
        } else {
            var description = res.toString().match(/DISTRIB_DESCRIPTION="(.+)"/);
            if (description) {
                state.osName = description[1];
            } else {
                state.osName = res.toString();
            }
        }

        if (/debian/i.test(state.osName)) {
            state.osFamaly = 'd';
            if (/7/.test(state.osName)) {
                state.osVersion = '7';
            } else if (/8/.test(state.osName)) {
                state.osVersion = '8';
            } else if (/9/.test(state.osName)) {
                state.osVersion = '9';
            }
        } else if (/ubuntu/i.test(state.osName)) {
            state.osFamaly = 'u';
            if (/14\.04/.test(state.osName)) {
                state.osVersion = '1404';
            } else if (/16\.04/.test(state.osName)) {
                state.osVersion = '16.04';
            } else if (/17\.10/.test(state.osName)) {
                state.osVersion = '1710';
            }
        } else if (/fedora/i.test(state.osName)) {
            state.osFamaly = 'f';
            if (/25/.test(state.osName)) {
                state.osVersion = '25';
            } else if (/26/.test(state.osName)) {
                state.osVersion = '26';
            } else if (/27/.test(state.osName)) {
                state.osVersion = '27';
            }
        } else if (/centos/i.test(state.osName)) {
            state.osFamaly = 'c';
            if (/6/.test(state.osName)) {
                state.osVersion = '6';
            } else if (/7/.test(state.osName)) {
                state.osVersion = '7';
            }
        } else if (/arch linux/i.test(state.osName)) {
            state.osFamaly = 'a';
        }
        uiCallback();
    });
};

var getStatus = function () {
    var statusScript = script.replace(/^\s*read .*$/mg, 'exit');

    sshell.runBashScriptAsRoot(con, statusScript).then((s) => {
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

var installOpenVPN = function () {
    var installScript = script.
    replace(/^\s*read.*-i\s+([^\s]+)\s+(CONTINUE)$/mg, '$2="$1"; echo "$$$2"'). //Continue update in Arch Linux
    replace(/^\s*read.*(CONTINUE)$/mg, '$1="n"; echo "$$$1"'). //Do not continue on unsupported OS
    replace(/^\s*read.*(option)/mg, '$1="4"; echo "$$$1"'). //Select option 4 to be soure while installing
    replace(/^\s*read.*-i\s+([^\s]+)\s+([^\s]+)/mg, '$2="$1"; echo "$$$2"'). //Everywhere use default settings
    replace(/^\s*read.+Press any key.*$/mg, ''). //Never wait for pressing any key
    replace(/^\s*read.+(USEREXTERNALIP)/mg, '$1="' + con.config.host + '"; echo "$$$1"'); //Use host from SSH connection if needed

    state.installationInProgress = true;
    state.readyToInstall = false;
    uiCallback();

    state.startTime = new Date().getTime();

    return sshell.runBashScriptAsRoot(con, installScript).then((s) => {
        state.report.success = true;
        state.report.text = s;

        state.installationInProgress = false;
        getStatus();
        getClients();
    }, (s) => {
        state.report.success = false;
        state.report.text = s;

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

    sshell.runBashScriptAsRoot(con, uninstallScript).then((s) => {
        state.report.success = true;
        state.report.text = s;

        state.uninstallationInProgress = false;
        getStatus();
    }, (s) => {
        state.report.success = false;
        state.report.text = s;

        state.uninstallationInProgress = false;
        getStatus();
    });
};

var addNewClient = function (name) {
    var addClientScript = script.
    replace(/^\s*read.*(option)/mg, '$1="1"; echo "$$$1"'). // Select option 1 to add new client
    replace(/^\s*read.*(CLIENT)/mg, '$1="' + name + '"; echo "$$$1"'); // New clint's name

    return sshell.runBashScriptAsRoot(con, addClientScript).
        then(() => getClients());
};

var getClients = function () {
    sshell.runCmdAsRoot(con, "ls *.ovpn | cat").then((s) => {
        state.clients = s.trim().split(/\s*[\r\n]+\s*/g);
        state.clients = state.clients.filter ((s) => {return !s.includes(':');});
        uiCallback();
    }, (s) => {
        uiCallback();
    });
};

var getFile = function (file) {
    sshell.runCmdAsRoot(con, "echo \"|\"; cat \"" + file + "\" | base64; echo \"|\"").then((s) => {
        s = s.replace(/[\r\n]/g, '');
        var base64 = /\|((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)\|/.exec(s)[1];
        state.report.takeFile = {name: file, body: base64};
        uiCallback();
    }, (s) => {
        uiCallback();
    });
};
