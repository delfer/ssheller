const shell = require('electron').shell;

var fixExtLinks = function () {
  $('a.ext').click((event) => {
    event.preventDefault();
    shell.openExternal(event.target.href);
  });
};

fixExtLinks();

views = {
  ServerList: {},
  AddServer: {},
  Plugins: {}
};

function switchMainView(view) {
  $('div.main-view').filter('#' + view).removeClass('d-none');
  $('div.main-view').not('#' + view).addClass('d-none');
  eval('views.' + view + '.activate();');
}

function saveServer() {

  // Form validation
  var form = document.getElementById('addServerForm');

  if (form.checkValidity() === false) {
    form.classList.add('was-validated');
    return;
  }

  H5_loading.show();

  // Serever name
  var serverName = $('#name').val();

  if (!serverName || serverName.length === 0) {
    serverName = $('#user').val() + '@' + $('#host').val() + ':' + $('#port').val();
  }

  // Save everything after file upload
  var continueAfterUpload = function (key) {
    if (!key && tempServerKey) {
      key = tempServerKey;
    }

    let server = {
      name: serverName,
      host: $('#host').val(),
      port: $('#port').val(),
      user: $('#user').val(),
      password: $('#password').val(),
      rootPassword: $('#rootPassword').val(),
      key: key
    };

    backend.addServer(server);
    switchMainView('ServerList');

    H5_loading.hide();

    //Reset entered values
    $('#name').val($('#name').attr('value'));
    $('#host').val($('#host').attr('value'));
    $('#port').val($('#port').attr('value'));
    $('#user').val($('#user').attr('value'));
    $('#password').val($('#password').attr('value'));
    $('#rootPassword').val($('#rootPassword').attr('value'));
    $('#keyFile').val('');
    tempServerKey = undefined;

    form.classList.remove('was-validated');
  };

  // Private key
  var file = document.getElementById("keyFile").files[0];
  if (file) {
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      continueAfterUpload(evt.target.result);
    };
    reader.onerror = function (evt) {
      continueAfterUpload();
    };
  } else {
    continueAfterUpload();
  }

}

function deleteServer() {
  let server = {
    name: $("#serverSelector option:selected").text(),
  };

  backend.deleteServer(server);
  switchMainView('ServerList');
}

function editServer() {
  var serverName = $("#serverSelector option:selected").text();

  var server = backend.getServers().filter((s) => {
    return s.name === serverName;
  }).shift();

  $('#name').val(server.name);
  $('#host').val(server.host);
  $('#port').val(server.port);
  $('#user').val(server.user);
  $('#password').val(server.password);
  $('#rootPassword').val(server.rootPassword);

  tempServerKey = server.key;

  switchMainView('AddServer');
}

function connect() {
  let serverName = $("#serverSelector option:selected").text();
  if (serverName === undefined || serverName.length === 0) {
    return;
  }
  H5_loading.show();
  backend.connect(serverName).then(function (arg) {
      $('#serverLabel').html(serverName);
      switchMainView('Plugins');
      H5_loading.hide();
    },
    function (arg) {
      H5_loading.hide();
      $('#mainModalLabel').html('Connection error');
      $('#mainModalBody').html(arg);
      $('#mainModal').modal('show');
    });
}

function disconnect() {
  backend.disconnect();
  switchMainView('ServerList');
}

viewServerList = {};

views.ServerList.activate = function () {
  var servers = backend.getServers();
  var $list = $('#serverSelector');
  $list.empty();
  $.each(servers, function () {
    $list.append($("<option />").text(this.name));
  });
};

views.AddServer.activate = function () {};

views.Plugins.activate = function () {
  let selFunc = function () {
    let pluginName = $('#pluginSelector option:selected').text();
    $('#PluginContent').html(backend.getPluginView(pluginName));
    fixExtLinks();
  };

  var plugins = backend.getPlugins();
  var $list = $('#pluginSelector');
  $list.empty();
  $list.off('refreshed.bs.select');
  $list.on('refreshed.bs.select', selFunc);
  $list.off('changed.bs.select');
  $list.on('changed.bs.select', selFunc);
  $.each(plugins, function () {
    $list.append($("<option />").text(this));
  });
  $list.selectpicker('refresh');
};

function pluginInterract(data) {
  return backend.pluginInterract(data);
}
