plugin = require("plugin");

plugins = [];

exports.load = function () {
    plugin(plugins).
    require('plugins').
    load();
};

exports.list = function () {
    return plugins;
};
