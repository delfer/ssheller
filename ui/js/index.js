views = {
  ServerList: {},
  AddServer: {}
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
