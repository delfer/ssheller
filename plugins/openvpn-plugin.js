var plugin = {};
var sys = {};

plugin.name = 'OpenVPN';

plugin.getView = function () {
    return '<h1>OpenVPN</h1>';
};

plugin.setViewRefreshCallback = function (callback) {
    return sys.callback = callback;
};

plugin.setSSHConnection = function (ssh) {
    return sys.ssh = ssh;
};

plugin.interract = function (data) {
    return true;
};

exports.plugin = function(list, loader) {
    return list.push(plugin);
};