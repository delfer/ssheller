var plugin = {
    name: 'Maintenance'
};

var sshell = require('../sshell');

var con;
var uiCallback;

plugin.getView = function () {
    return `
        <div class="row border border-warning m-1 bg-danger align-middle">
            <div class="col m-auto">
                <input type="range" id="rebootSlider" class="form-control-range" min="0" max="101" value="0" step="0" name="result">
            </div>
            <div class="col-auto m-3">
                <button id="rebootBtn" class='btn btn-sm btn-warning' onclick="reboot()" disabled>Reboot</button>
            </div>
        </div>

        <script>
            function reboot () {
                if (!$("#rebootBtn").attr("disabled")) {
                    pluginInterract({reboot: true});
                }
            }

            $("#rebootSlider").change(function () {
                if ($(this).val() === "101") {
                    $("#rebootBtn").removeAttr("disabled");
                } else {
                    $("#rebootBtn").attr("disabled", "");
                }
            });

            function pluginViewRefreshCallback (report) {
                if (report.rebootFail) {
                    $('#mainModalLabel').html('Reboot failed! ');
                    $('#mainModalBody').html('<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + report.error + '</textarea>');
                    $('#mainModal').modal('show');
                } else if (report.reboot) {
                    disconnect();
                }
            };
        </script>
    `;
};

plugin.setViewRefreshCallback = function (callback) {
    uiCallback = function (data) {
        callback(data, plugin.name);
    };
};

plugin.setSSHConnection = function (ssh) {
    con = ssh;
};

plugin.interract = function (request) {
    if (request.reboot) {
        rebootServer();
    }
};

plugin.reset = function () {};

exports.plugin = function (list, loader) {
    list.push(plugin);
};

var rebootServer = function () {
    sshell.runCmdAsRoot(con, "shutdown -r now").
    then(() => {
        uiCallback({
            reboot: true
        });
    }, (e) => {
        uiCallback({
            rebootFail: true,
            error: e.message
        });
    });
};
