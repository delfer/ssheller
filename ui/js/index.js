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

function addServer() {
  let server = {
    name: $('#name').val(),
    host: $('#host').val(),
    port: $('#port').val(),
    user: $('#user').val(),
    password: $('#password').val(),
    key: undefined
  };

  backend.addServer(server);
  switchMainView('ServerList');
}

function deleteServer() {
  let server = {
    name: $("#serverSelector option:selected").text(),
  };

  backend.deleteServer(server);
  switchMainView('ServerList');
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
  $('#serverSelector').empty();
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
