var plugin = {};
var sys = {};

plugin.name = 'OpenVPN';

plugin.getView = function () {
    return '<h1>OpenVPN</h1>';
};

plugin.setViewRefreshCallback = function (callback) {
    sys.callback = callback;
};

plugin.setSSHConnection = function (ssh) {
    sys.ssh = ssh;
};

plugin.interract = function (data) {
};

plugin.reset = function () {
};

exports.plugin = function(list, loader) {
    list.push(plugin);
};