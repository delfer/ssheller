var numeral = require('numeral');
var sshell = require('../sshell');

var plugin = {};
var sys = {};
var data = {};
data.cpu = [];
data.ram = [];
var refresher;

plugin.name = 'Dashboard';

plugin.getView = function () {
    return `
    <style>
    .dash-chart {
        width: 24rem;
        height: 10rem;
    }
    </style>
    <div class="row justify-content-center">
        <div class="col-auto border border-success m-1 text-center">
            <b>Hostname:</b><br/>
            <label id="hostname">Loading...</label>
        </div>
        <div class="col-auto border border-success m-1 text-center">
            <b>Server time:</b><br\>
            <label id="date">Loading...</label>
        </div>
        <div class="col-auto border border-success m-1 text-center">
            <b>CPU Cores:</b><br\>
            <label id="cpu-cores">Loading...</label>
        </div>
        <div class="col-auto border border-success m-1 text-center">
            <b>Disk usage (/):</b><br\>
            <label id="disk-used">Loading...</label> of <label id="disk-total">Loading...</label>
        </div>
        <div class="col-auto border border-success m-1 text-center">
        <b>OS:</b><br\>
        <label id="os-lb">Loading...</label>
    </div>
    </div>
    <div class="row justify-content-center m-1">
        <div id="cpu-chart" class="dash-chart border border-info m-1"></div>
        <div id="ram-chart" class="dash-chart border border-info m-1"></div>
    </div>

    <hr/>

    <!-- Credits -->
    <div class="card mt-4">
        <div class="card-header">
            <a class="card-link" data-toggle="collapse" href="#collapseCredits">
            Credits
            </a>
        </div>
        <div id="collapseCredits" class="collapse">
            <div class="card-body">
            Based on <a class='ext' href='https://www.taucharts.com/'>TauCharts</a>
            </div>
        </div>
    </div>

    <script>
    defaultChartConfig = {
        data: [{dt:'2018-03-23T18:54:21+03:00', val:0}],
        type: 'line',
        x: 'dt',
        y: 'val',
        guide: {
            y: {
                label: undefined
            },
            x: {
                label: 'time'
            }
        },
        settings: {
            animationSpeed: 0
        },
        plugins: [
            tauCharts.api.plugins.get('tooltip')()
        ]
    };
    cpuChartConfig=defaultChartConfig;
    cpuChartConfig.guide.y.label = 'CPU Usage %';
    cpuChart = new tauCharts.Chart(cpuChartConfig);

    ramChartConfig=defaultChartConfig;
    ramChartConfig.guide.y.label = 'RAM Usage';
    ramChartConfig.color = 'name';
    ramChart = new tauCharts.Chart(ramChartConfig);

    function pluginViewRefreshCallback (data) {
        $('#hostname').html(data.hostname.toString());
        $('#date').html(data.date.toString());
        $('#cpu-cores').html(data.cpu_count.toString());
        $('#disk-used').html(data.rootfs.used.toString());
        $('#disk-total').html(data.rootfs.total.toString());
        $('#os-lb').html(data.os.toString());
        cpuChart.setData(data.cpu);
        cpuChart.renderTo('#cpu-chart');
        ramChart.setData(data.ram);
        ramChart.renderTo('#ram-chart');
    }
    </script>
    `;
};

plugin.setViewRefreshCallback = function (callback) {
    sys.callback = function (data) {
        callback(data, plugin.name);
    };
};

plugin.setSSHConnection = function (ssh) {
    sys.ssh = ssh;
    refresher = setInterval(requestData, 1000);
    collectStatic();
};

plugin.interract = function (data) {};

plugin.reset = function () {
    clearInterval(refresher);
};

exports.plugin = function (list, loader) {
    list.push(plugin);
};

var requestData = function () {
    sshell.runCmd(sys.ssh, 'date').then((res) => {
        data.date = res.toString();
        sys.callback(data);
    }, () => {});

    sshell.runCmd(sys.ssh, 'date -Iseconds').then((res) => {
        data.date_ = res.toString().trim();
        sys.callback(data);
    }, () => {});

    sshell.runCmd(sys.ssh, 'uptime').then((res) => {
        data.uptime = res.toString();
        parseUptime(res.toString());
        sys.callback(data);
    }, () => {});

    sshell.runCmd(sys.ssh, 'free').then((res) => {
        data.free = res;
        parseFree(res.toString());
        sys.callback(data);
    }, () => {});

    sshell.runCmd(sys.ssh, 'df /').then((res) => {
        let nums = res.toString().split('\n')[1].match(/\d+/g);

        data.rootfs = {
            total: numeral(nums[1] * 1024 + nums[2] * 1024).format('0.0b'),
            used: numeral(nums[1] * 1024).format('0.0b')
        };
        sys.callback(data);
    }, () => {});
};

var parseUptime = function (str) {
    // 19:41:40 up 29 days, 19:36,  3 users,  load average: 0,00, 0,01, 0,00
    let res = str.match(/: (\d)[.,](\d\d)/);
    if (data.date_)
        data.cpu.push({
            dt: data.date_,
            val: (res[1] * 1 + res[2] / 100) * 100 / data.cpu_count
        });
    if (data.cpu.length > 25) {
        data.cpu = data.cpu.slice(-25);
    }
};

var parseFree = function (str) {
    //               total        used        free      shared  buff/cache   available
    // Память:     8174872      624276     3369452       17900     4181144     7198348
    // Подкачка:           0           0           0
    let labels = str.split('\n')[0].match(/[^\s]+/g);
    let values = str.split('\n')[1].match(/\d+/g);
    if (labels.indexOf('total') > -1) {
        let total = values[labels.indexOf('total')] * 1;
        let used = 0;
        if (labels.indexOf('available') > -1) {
            used = total - values[labels.indexOf('available')] * 1;
        } else {
            //              total       used       free     shared    buffers     cached
            // Mem:       8174872    4806616    3368256      17900     875636    2993328
            // -/+ buffers/cache:     937652    7237220
            // Swap:            0          0          0
            let values2 = str.split('\n')[2].match(/\d+/g);
            used = total - values2[labels.indexOf('free') - 1] * 1;
        }
        if (data.date_)
            data.ram.push({
                dt: data.date_,
                val: total * 1024,
                name: 'total'
            }, {
                dt: data.date_,
                val: used * 1024,
                name: 'used'
            });
        if (data.ram.length > 50) {
            data.ram = data.ram.slice(-50);
        }
    }
};

var collectStatic = function () {
    sshell.runCmd(sys.ssh, 'hostname -f').then((res) => {
        data.hostname = res;
    }, () => {});

    sshell.runCmd(sys.ssh, 'grep -c vendor_id /proc/cpuinfo').then((res) => {
        data.cpu_count = res.toString();
    }, () => {});

    sshell.runCmd(sys.ssh, 'cat /etc/*-release').then((res) => {
        let pretty = res.toString().match(/PRETTY_NAME="(.+)"/);
        if (pretty) {
            data.os = pretty[1];
        } else {
            let description = res.toString().match(/DISTRIB_DESCRIPTION="(.+)"/);
            if (description) {
                data.os = description[1];
            } else {
                data.os = res.toString();
            }
        }
    }, () => {});
};
