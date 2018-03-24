var plugin = {};
var sys = {};
var refresher;

plugin.name = 'OpenVPN';

plugin.getView = function () {
    return `
        <button type="button" class="btn btn-success" onClick="console.log(pluginInterract({action: 'install'}))">Install</button>
        <script>
        function pluginViewRefreshCallback (data) {
            console.log (data);
        };
        </script>
    `;
};

plugin.setViewRefreshCallback = function (callback) {
    sys.callback = function(data) { callback (data, plugin.name); };
};

plugin.setSSHConnection = function (ssh) {
    sys.ssh = ssh;
    refresher = setInterval(requestData, 1000);
};

plugin.interract = function (data) {
    console.log(data);
    return ('OK!');
};

plugin.reset = function () {
    clearInterval(refresher);
};

exports.plugin = function(list, loader) {
    list.push(plugin);
};

var requestData = function () {
    sys.callback('hello from VPN!');
};
