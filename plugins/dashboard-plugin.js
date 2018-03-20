var plugin = {};
var sys = {};
var data = {};
var refresher;

plugin.name = 'Dashboard';

plugin.getView = function () {
    return `
    <script>function pluginViewRefreshCallback (data) {
        $('#hostname').html(data.hostname.toString());
        $('#date').html(data.date.toString());  
    }</script>
    <b>Hostname:</b> <label id="hostname">Loading...</label>
    <b>Date:</b> <label id="date">Loading...</label>
    `;
};

plugin.setViewRefreshCallback = function (callback) {
    sys.callback = callback;
};

plugin.setSSHConnection = function (ssh) {
    sys.ssh = ssh;
    refresher = setInterval(requestData, 1000);
};

plugin.interract = function (data) {};

plugin.reset = function () {
    console.log("dash stoped");
    clearInterval(refresher);
};

exports.plugin = function (list, loader) {
    list.push(plugin);
};

var requestData = function () {
    sys.ssh.exec('hostname -f', function (err, stream) {
        //if (err) throw err;
        stream.on('data', function (res) {
            data.hostname = res;
            sys.callback(data);
        });
 

        // stream.on('close', function (code, signal) {
        //     console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
        //     sys.ssh.end();
        // }).on('data', function (data) {
        //     console.log('STDOUT: ' + data);
        // }).stderr.on('data', function (data) {
        //     console.log('STDERR: ' + data);
        //});
    });

    sys.ssh.exec('date', function (err, stream) {
        stream.on('data', function (res) {
            data.date = res;
            sys.callback(data);
        });
    });
};