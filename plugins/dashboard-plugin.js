var numeral = require('numeral');
var sshell = require('../sshell');

var refresher;

var uiCallback;
var con;
var state = {
    cpu: [],
    ram: []
};

exports.name = 'Dashboard';

exports.getView = function () {
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
            <b>Disk used (/):</b><br\>
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
        $('#hostname').html(data.hostname);
        $('#date').html(data.date);
        $('#cpu-cores').html(data.cpu_count);
        $('#os-lb').html(data.os);
        if (data.rootfs) {
            $('#disk-used').html(data.rootfs.used);
            $('#disk-total').html(data.rootfs.total);
        };
        cpuChart.setData(data.cpu);
        cpuChart.renderTo('#cpu-chart');
        ramChart.setData(data.ram);
        ramChart.renderTo('#ram-chart');
    }
    </script>
    `;
};

exports.setViewRefreshCallback = function (callback) {
    uiCallback = function () {
        callback(state, exports.name);
    };
};

exports.setSSHConnection = function (ssh) {
    con = ssh;
    refresher = setInterval(requestData, 10000);
    collectStatic();
};

exports.interract = function (request) {};

exports.reset = function () {
    clearInterval(refresher);
};

var requestData = function () {
    sshell.runCmd(con, 'date').then((res) => {
        state.date = res.toString();
        uiCallback();
    }, () => {});

    sshell.runCmd(con, 'date -Iseconds').then((res) => {
        state.date_ = res.toString().trim();
        uiCallback();
    }, () => {});

    sshell.runCmd(con, 'uptime').then((res) => {
        state.uptime = res.toString();
        parseUptime(res.toString());
        uiCallback();
    }, () => {});

    sshell.runCmd(con, 'free').then((res) => {
        state.free = res;
        parseFree(res.toString());
        uiCallback();
    }, () => {});

    sshell.runCmd(con, 'df -B 1 /').then((res) => {
        let nums = res.toString().split('\n')[1].match(/\s+\d+/g);

        state.rootfs = {
            total: numeral(nums[0]).format('0.0ib'),
            used: numeral(nums[1]).format('0.0ib')
        };
        uiCallback(state);
    }, () => {});
};

var parseUptime = function (str) {
    // 19:41:40 up 29 days, 19:36,  3 users,  load average: 0,00, 0,01, 0,00
    let res = str.match(/: (\d)[.,](\d\d)/);
    if (state.date_)
        state.cpu.push({
            dt: state.date_,
            val: (res[1] * 1 + res[2] / 100) * 100 / state.cpu_count
        });
    if (state.cpu.length > 25) {
        state.cpu = state.cpu.slice(-25);
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
        if (state.date_)
            state.ram.push({
                dt: state.date_,
                val: total * 1024,
                name: 'total'
            }, {
                dt: state.date_,
                val: used * 1024,
                name: 'used'
            });
        if (state.ram.length > 50) {
            state.ram = state.ram.slice(-50);
        }
    }
};

var collectStatic = function () {
    sshell.runCmd(con, 'hostname -f').then((res) => {
        state.hostname = res;
        uiCallback();
    }, () => {});

    sshell.runCmd(con, 'grep -c vendor_id /proc/cpuinfo').then((res) => {
        state.cpu_count = res.toString();
        uiCallback();
    }, () => {});

    sshell.runCmd(con, 'cat /etc/*-release').then((res) => {
        let pretty = res.toString().match(/PRETTY_NAME="(.+)"/);
        if (pretty) {
            state.os = pretty[1];
        } else {
            let description = res.toString().match(/DISTRIB_DESCRIPTION="(.+)"/);
            if (description) {
                state.os = description[1];
            } else {
                state.os = res.toString();
            }
        }
        uiCallback();
    }, () => {});
};
