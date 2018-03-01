//Electron adapter
const { ipcRenderer } = require('electron');

function connectToSSH(prameters) {
    ipcRenderer.send('request-mainprocess-action', prameters);
}