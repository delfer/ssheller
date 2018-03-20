const {
  ipcMain,
  app,
  BrowserWindow
} = require('electron');
const path = require('path');
const url = require('url');
var sshClient = require('ssh2').Client;
var storage = require('./storage');
var plugins = require('./plugins-loader');

var serverConnection;

// Храните глобальную ссылку на объект окна, если вы этого не сделаете, окно будет
// автоматически закрываться, когда объект JavaScript собирает мусор.
let win;

function createWindow() {
  // Создаёт окно браузера.
  win = new BrowserWindow({
    width: 800,
    height: 600
  });

  // и загрузит index.html приложение.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'ui/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Откроет DevTools.
  win.webContents.openDevTools();

  // Возникает, когда окно будет закрыто.
  win.on('closed', () => {
    // Разбирает объект окна, обычно вы можете хранить окна     
    // в массиве, если ваше приложение поддерживает несколько окон в это время,
    // тогда вы должны удалить соответствующий элемент.
    win = null;
  });

  console.log("ready");
  plugins.load(pluginViewRefreshCallback);
}

// Этот метод будет вызываться, когда Electron закончит 
// инициализацию и готова к созданию окон браузера.
// Некоторые интерфейсы API могут использоваться только после возникновения этого события.
app.on('ready', createWindow);

// Выйти, когда все окна будут закрыты.
app.on('window-all-closed', () => {
  // На macOS это обычно для приложений и их строки меню   
  // оставаться активным до тех пор, пока пользователь не выйдет явно с помощью Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // На MacOS это общее для того чтобы создать окно в приложении, когда значок 
  // dock нажали и нет других открытых окон.
  if (win === null) {
    createWindow();
  }
});

ipcMain.on('add-server', function (event, server) {
  storage.create(server);
  event.returnValue = 'true';
});

ipcMain.on('delete-server', function (event, server) {
  storage.delete(server);
  event.returnValue = 'true';
});

ipcMain.on('get-servers', function (event, ignore) {
  event.returnValue = storage.read();
});

ipcMain.on('get-plugins', function (event, ignore) {
  event.returnValue = plugins.list().map(i => i.name);
});

ipcMain.on('get-plugin-view', function (event, pluginName) {
  event.returnValue = plugins.list().filter(i => i.name === pluginName).pop().getView();
});

ipcMain.on('connect', function (event, serverName) {
  let server = storage.read().filter(i => i.name === serverName).pop();

  serverConnection = new sshClient();

  serverConnection.on('ready', function () {
    event.sender.send('connect-reply', 'ok');
    plugins.setSSHConnection(serverConnection);
  }).connect({
    host: server.host,
    port: server.port,
    username: server.user,
    password: server.password
  });

  serverConnection.on('error', function (err) {
    event.sender.send('connect-reply', err.message);
  });
});

ipcMain.on('disconnect', function (event) {
  plugins.reset();
  serverConnection.end();
});

function pluginViewRefreshCallback(data) {
  win.webContents.send('plugin-view-refresh', data);
}
