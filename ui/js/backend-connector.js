//Electron adapter
const { ipcRenderer } = require('electron');

function connectToSSH(prameters) {
    ipcRenderer.send('request-mainprocess-action', prameters);
}

backend = {};

backend.addServer = function (server) {
    ipcRenderer.sendSync('add-server', server);
};

backend.deleteServer = function (server) {
    ipcRenderer.sendSync('delete-server', server);
};

backend.getServers = function (server) {
    return ipcRenderer.sendSync('get-servers', server);
};
