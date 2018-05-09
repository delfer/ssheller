var plugins = [
    require("./dashboard-plugin"),
    require("./maintenance-plugin"),
    require("./openvpn-plugin"),
    require("./docker-plugin")
];

exports.load = function (pluginViewRefreshCallback) {
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
