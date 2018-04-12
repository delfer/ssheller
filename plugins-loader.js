plugin = require("plugin");

plugins = [];
sharedScripts = {};

exports.load = function (pluginViewRefreshCallback) {
    plugin(plugins).
    require('plugins').
    load();
    plugins.forEach(i => i.setViewRefreshCallback(pluginViewRefreshCallback));
};

exports.list = function () {
    return plugins;
};

exports.setSSHConnection = function (con) {
    return plugins.forEach(i => i.setSSHConnection(con));
};

exports.reset = function () {
    return plugins.forEach(i => i.reset());
};
