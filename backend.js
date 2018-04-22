const {
  ipcMain,
  app,
  BrowserWindow
} = require('electron');
const path = require('path');

userDataPath = app.getPath('userData');
const LOG_PATH = path.join(userDataPath, 'ssheller.log');

const url = require('url');
var sshClient = require('ssh2').Client;
var storage = require('./storage');
var sshell = require('./sshell');
sharedScripts = require('./scripts');
plugins = require('./plugins');

var Log = require('log');
var rfs = require('rotating-file-stream');
log = new Log('debug', rfs(LOG_PATH, {
  size: '1M', // rotate every 1 MegaBytes written
  compress: 'gzip', // compress rotated files
  maxFiles: 3
}));
CircularJSON = require('circular-json');

var serverConnection;
var activePlugin;

var disconnectedByUser;

// Храните глобальную ссылку на объект окна, если вы этого не сделаете, окно будет
// автоматически закрываться, когда объект JavaScript собирает мусор.
let win;

function createWindow() {
  // Создаёт окно браузера.
  win = new BrowserWindow({
    width: 800,
    height: 600
  });

  //Disable main menu
  win.setMenu(null);

  // и загрузит index.html приложение.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'ui/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Откроет DevTools.
  //win.webContents.openDevTools();

  // Возникает, когда окно будет закрыто.
  win.on('closed', () => {
    // Разбирает объект окна, обычно вы можете хранить окна     
    // в массиве, если ваше приложение поддерживает несколько окон в это время,
    // тогда вы должны удалить соответствующий элемент.
    win = null;
  });

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
  storage.createServer(server);
  event.returnValue = 'true';
});

ipcMain.on('delete-server', function (event, server) {
  storage.deleteServer(server);
  event.returnValue = 'true';
});

ipcMain.on('get-servers', function (event, ignore) {
  event.returnValue = storage.readServers();
});

ipcMain.on('get-plugins', function (event, ignore) {
  event.returnValue = plugins.list().map(i => i.name);
});

ipcMain.on('get-plugin-view', function (event, pluginName) {
  event.returnValue = plugins.list().filter(i => i.name === pluginName).pop().getView();
  activePlugin = pluginName;
});

ipcMain.on('connect', function (event, serverName) {
  let server = storage.readServers().filter(i => i.name === serverName).pop();

  serverConnection = new sshClient();

  var startConnection = () => {
    log.info('Connecting...');
    try {
      serverConnection.connect({
        host: server.host,
        port: server.port,
        username: server.user,
        password: serverConnection.tempPassword ? serverConnection.tempPassword : server.password,
        privateKey: server.key
      });
    } catch (e) {
      event.sender.send('connect-reply', e.message);
    }
  };

  serverConnection.reconnect = () => {
    log.info('Reconnecting...');
    disconnectedByUser = true;
    serverConnection.end();
    return setTimeout(startConnection, 1000);
  };

  serverConnection.on('ready', function () {
    sshell.checkPasswordExpire(serverConnection).then(
      () => {
        serverConnection.config.rootPassword = server.rootPassword; //It's not needed by ssh2, but config here used just as storage
        plugins.setSSHConnection(serverConnection);
        log.debug('con: %s', CircularJSON.stringify(serverConnection).replace(/("\w*password\w*"\s*:\s*)"[^"]*"/gi, '$1"XXX"'));
        disconnectedByUser = false;
        event.sender.send('connect-reply', 'ok');
      },
      (e) => {
        log.warning('Not connected: password changed');
      }
    );
  });

  startConnection();

  serverConnection.on('close', function (hadError) {
    log.error('Disconnect ' + hadError);
    // Reconnect
    if (!disconnectedByUser) {
      startConnection();
    }
  });

  serverConnection.on('error', function (err) {
    event.sender.send('connect-reply', err.message);
  });
});

ipcMain.on('disconnect', function (event) {
  disconnectedByUser = true;
  plugins.reset();
  serverConnection.end();
});

ipcMain.on('plugin-interract', function (event, data) {
  let res = plugins.list().filter(i => i.name === activePlugin).pop().interract(data);
  if (res) {
    event.returnValue = res;
  } else {
    event.returnValue = true;
  }

});

function pluginViewRefreshCallback(data, pluginName) {
  if (activePlugin === pluginName) {
    return win.webContents.send('plugin-view-refresh', data);
  }
}
