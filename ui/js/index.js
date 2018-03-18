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
}

function deleteServer() {
  let server = {
    name: $( "#serverSelector option:selected" ).text(),
  };

  backend.deleteServer(server);
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

views.AddServer.activate = function () {
};

views.Plugins.activate = function () {
  let selFunc = function () {
    let pluginName = $('#pluginSelector option:selected').text();
    console.log(pluginName);
    $('#PluginContent').html(backend.getPluginView(pluginName));
  };

  var plugins = backend.getPlugins();
  var $list = $('#pluginSelector');
  $list.empty();
  $list.on('refreshed.bs.select', selFunc);
  $list.on('changed.bs.select', selFunc);
  $.each(plugins, function () {
    $list.append($("<option />").text(this));
  });
  $list.selectpicker('refresh');  
};
