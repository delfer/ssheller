//Electron adapter
const {
    ipcRenderer
} = require('electron');

function connectToSSH(prameters) {
    return ipcRenderer.send('request-mainprocess-action', prameters);
}

backend = {};

backend.addServer = function (server) {
    return ipcRenderer.sendSync('add-server', server);
};

backend.deleteServer = function (server) {
    return ipcRenderer.sendSync('delete-server', server);
};

backend.getServers = function () {
    return ipcRenderer.sendSync('get-servers');
};

backend.getPlugins = function () {
    return ipcRenderer.sendSync('get-plugins');
};

backend.getPluginView = function (pluginName) {
    return ipcRenderer.sendSync('get-plugin-view', pluginName);
};

backend.connect = function (serverName) {
    return new Promise(function (resolve, reject) {
        ipcRenderer.send('connect', serverName);
        ipcRenderer.on('connect-reply', function (event, arg) {
            if (arg === 'ok') {
                resolve();
            } else {
                reject(arg);
            }
        });
    });
};

backend.disconnect = function () {
    ipcRenderer.send('disconnect');
};

ipcRenderer.on('plugin-view-refresh', function (event, data) {
    pluginViewRefreshCallback(data);
});

backend.pluginInterract = function (data) {
    return ipcRenderer.sendSync('plugin-interract', data);
};
