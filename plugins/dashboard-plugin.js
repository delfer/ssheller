var plugin = {};
var sys = {};

plugin.name = 'Dashboard';

plugin.getView = function () {
    return '<h1>Dashboard</h1>';
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