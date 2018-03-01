const {ipcMain, app, BrowserWindow} = require('electron');
  const path = require('path');
  const url = require('url');
  var sshClient = require('ssh2').Client;
  
  // Храните глобальную ссылку на объект окна, если вы этого не сделаете, окно будет
  // автоматически закрываться, когда объект JavaScript собирает мусор.
  let win;
  
  function createWindow () {
    // Создаёт окно браузера.
    win = new BrowserWindow({width: 800, height: 600});
  
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
  
  // В этом файле вы можете включить код другого основного процесса 
  // вашего приложения. Можно также поместить их в отдельные файлы и применить к ним require.

  ipcMain.on('request-mainprocess-action', (event, arg) => {
    // Displays the object sent from the renderer process:
    //{
    //    message: "Hi",
    //    someData: "Let's go"
    //}
    console.log(
        arg
    );

    var conn = new sshClient();
conn.on('ready', function() {
  console.log('Client :: ready');
  conn.exec('uptime', function(err, stream) {
    if (err) throw err;
    stream.on('close', function(code, signal) {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', function(data) {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', function(data) {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: arg.host,
  port: arg.port,
  username: arg.user,
  password: arg.password
});

});