exports.name = 'Docker';

var sshell = require('../sshell');
var fs = require('fs');
const path = require('path');
const https = require('https');

var profiles = require('./docker-profiles.json');

var refresher;

var installScript;

fs.readFile(path.join(__dirname, '../scripts/docker-install.sh'), 'utf8', function (err, out) {
    if (!err && out) {
        installScript = out.replace('( set -x; sleep 20 )', 'exit'); // Exit from script if docker already installed
    }
});

var usedPortsCmd = `docker run -ti --rm --net=host --entrypoint '' utils/ss sh -c 'ss -lntu` +
    ` | awk "{print \\$5\\",\\"\\$1}"` +
    ` | tail -n +2` +
    ` | grep -o ":[0-9]\\{1,\\},[tcpud]\\{3\\}$"` +
    ` | sed "s/://"` +
    ` | sort` +
    ` | uniq'`;
// will return:
// 22,tcp
// 32768,tcp
// 32768,udp
// 32769,udp

var con;
var uiCallback;

var state = {};
var imageLoader;
var images = [];
var imgTags = new Map();

var osSupportList = [{
        name: 'Centos',
        version: ['7']
    },
    {
        name: 'Fedora',
        version: ['26', '27', '28']
    },
    {
        name: 'Debian',
        version: ['8', '9', '10']
    },
    {
        name: 'Ubuntu',
        version: ['14.04', '16.04', '17.10', '18.04']
    }
];

exports.getView = function () {
    var osWidget = widgets.os.getView(osSupportList);
    state.osSupported = widgets.os.isSupported;
    imageLoader.then((imgs) => uiCallback({
        images: imgs
    }));
    setImmediate(checkDocker);
    return `
        <!-- OS -->
        ${osWidget}

        <!-- Status -->
        <div id="statusDiv" class="alert" role="alert">
            Loading...
        </div>

        <!-- Install button -->
        <div id="installBtnDiv" class="d-none">
            <button id="installBtn" type="button" class="btn btn-success" onClick="install()" disabled>Install</button>
        </div>

        <!-- Containers list -->
        <div id="containersDiv" class="container d-none">
            <h5>Containers</h5>
            <table class="table table-hover table-bordered table-sm">
            <thead>
            <tr>
                <th>Image</th>
                <th>Ports</th>
                <th>Status</th>
                <th>Volumes</th>
                <th></th>
            </tr>
            </thead>
            <tbody id="containersTable">
            </tbody>
        </table>
        </div>

        <!-- Volumes list -->
        <div id="volumesDiv" class="container d-none">
            <hr/>
            <h5>Volumes</h5>
            <table class="table table-hover table-bordered table-sm">
            <thead>
            <tr>
                <th>Attach to new</th>
                <th>Name</th>
                <th></th>
            </tr>
            </thead>
            <tbody id="volumesTable">
            </tbody>
        </table>
        </div>

        <!-- Image run -->
        <div id="runDiv" class="border border-info d-none">
            <form>
                <div class="form-group row m-1">
                    <label for="volumeInput" class="col-auto col-form-label"><i>Optional</i> <b>Volume</b>&nbsp;&nbsp;&nbsp;&nbsp;</label>
                    <div class="col">
                        <input type="text" readonly class="form-control-plaintext" id="volumeInput" placeholder="<New>">
                    </div>
                </div>
                <div class="form-group row m-1">
                    <label for="inputPassword" class="col-auto col-form-label"><i>Optional</i> <b>Password</b></label>
                    <div class="col">
                        <input type="password" class="form-control" id="inputPassword" placeholder="Password" length="64">
                    </div>
                </div>
                <div class="form-group row m-1">
                    <select id="imageSelector" class="col selectpicker" title="image" data-live-search="true">
                        <option>Loding...</option>
                    </select>
                    <select id="tagSelector" class="col selectpicker" data-live-search="true">
                        <option>latest</option>
                    </select>
                    <div class="col-auto">
                        <button id="runImageBtn" type="button" class="btn btn-sm btn-success" onClick="runImage()" disabled>Run</button>
                    </div>
                </div>
            </form>
        </div>

        <script>
            $("#imageSelector").selectpicker("refresh");
            $("#tagSelector").selectpicker("refresh");

            function pluginViewRefreshCallback (data) {
                if (data.state) {
                    var statusText;
                    var statusClass;

                    if (data.state.installInProgess) {
                        statusText = "Docker installation in progress";
                        statusClass = "alert-warning";
                        $("#installBtn").attr("disabled", "");
                        $("#installBtnDiv").removeClass("d-none");
                    } else if (data.state.installed) {
                        statusText = "Docker installed and ready for use";
                        statusClass = "alert-success";
                        $("#installBtn").attr("disabled", "");
                        $("#installBtnDiv").addClass("d-none");
                        $("#containersDiv").removeClass("d-none");
                        $("#volumesDiv").removeClass("d-none");
                        $("#runDiv").removeClass("d-none");
                    } else if (!data.state.osSupported) {
                        statusText = "OS not supported";
                        statusClass = "alert-danger";
                        $("#installBtn").attr("disabled", "");
                        $("#installBtnDiv").removeClass("d-none");
                    } else if (!data.state.installed) {
                        statusText = "Docker ready for install";
                        statusClass = "alert-success";
                        $("#installBtn").removeAttr("disabled");
                        $("#installBtnDiv").removeClass("d-none");
                    }
    
                    $("#statusDiv").removeClass();
                    $("#statusDiv").addClass("alert");
                    $("#statusDiv").addClass(statusClass);
                    $("#statusDiv").html(statusText);

                } else if (data.images) {
                    var selFunc = function () {
                        $("#runImageBtn").removeAttr("disabled");
                        $("#tagSelector").val(); // Workaround for possible bug in Booostrap-select
                        $("#tagSelector").selectpicker("refresh");
                        $("#tagSelector").empty();
                        $("#tagSelector").selectpicker("refresh");
                        let img = $("#imageSelector option:selected").text();
                        pluginInterract({getTags: img});
                      };

                    var $list = $("#imageSelector");
                    $list.empty();
                    $list.off("changed.bs.select");
                    $list.on("changed.bs.select", selFunc);
                    $.each(data.images, function () {
                        $list.append($("<option />").text(this));
                    });
                    $list.selectpicker("refresh");
                } else if (data.tags) {
                    var $list = $("#tagSelector");
                    $list.empty();
                    $list.append($("<option />").text("latest"));
                    $.each(data.tags, function () {
                        if (this != "latest") {
                            $list.append($("<option />").text(this));
                        }
                    });
                    $list.selectpicker("refresh");
                } else if (data.containers) {
                    var tbl = $("#containersTable");
                    tbl.empty();
                    $.each(data.containers, function () {
                        var cls = "";
                        if (/up/i.test(this.status)) {
                            this.status = "OK";
                            cls = "table-success";
                        } else {
                            this.status = "FAIL";
                            cls = "table-danger";
                        }

                        tbl.append("<tr class=\\"" + cls + "\\"><td style=\\"word-break: break-all\\">" + 
                                this.image + 
                            "</td><td>" + 
                                this.ports.replace(/,/g,",<br>").replace(/0\\.0\\.0\\.0/g, "*") + 
                            "</td><td>" + 
                                this.status + 
                            "</td><td>" + 
                                this.volumes.replace(/,/g,",<br>") + 
                            "</td><td class=\\"text-center\\"><a href=\\"#\\" onclick=\\"rmContainer('" + this.name + "');return false;\\" class=\\"badge badge-danger\\">x</a>" + 
                            "</td></tr>");
                    });
                } else if (data.volumes) {
                    var tbl = $("#volumesTable");
                    tbl.empty();
                    $.each(data.volumes, function () {
                        var checked = "";
                        if (this == $("#volumeInput").val()) {
                            checked = " checked";
                        }

                        tbl.append("<tr><td>" +
                        "<div class=\\"form-check form-check-inline\\">" +
                        "<input class=\\"form-check-input\\" type=\\"checkbox\\" id='vol_" + this + "' value='" + this + "' onclick=\\"vol('" + this + "')\\"" + checked + ">" +
                        "</div>" +
                        "</td><td>" + 
                        this + 
                        "</td><td class=\\"text-center\\"><a href=\\"#\\" onclick=\\"rmVolume('" + this + "');return false;\\" class=\\"badge badge-danger\\">x</a></td></tr>");
                    });
                }

            };

            function vol (v) {
                var ch = $("#vol_" + v);

                if (ch.prop("checked")) {
                    $("input[id^=vol_]").prop("checked", false);
                    ch.prop("checked", true);
                    $("#volumeInput").val(v);
                } else {
                    $("#volumeInput").val("");
                }
            };

            function install () {
                pluginInterract({install: true});
            };

            function runImage () {
                var img = $("#imageSelector option:selected").text();
                var tag = $("#tagSelector option:selected").text();
                var vol = $("#volumeInput").val();
                var pass = $("#inputPassword").val();
                pluginInterract({
                    runImage: img, 
                    tag: tag,
                    volume: vol,
                    inputs: {
                        PASSWORD: pass
                    }
                });
            }

            function rmContainer(c) {
                pluginInterract({rmContainer: c});
            }

            function rmVolume(v) {
                pluginInterract({rmVolume: v});
                if (v == $("#volumeInput").val()) {
                    $("input[id^=vol_]").prop("checked", false);
                    $("#volumeInput").val("");
                }
            }

        </script>
    `;
};

exports.setViewRefreshCallback = function (callback) {
    uiCallback = function (data) {
        callback(data, exports.name);
    };
};

exports.setSSHConnection = function (ssh) {
    con = ssh;
    widgets.os.init(con);
    checkDocker();
    updateContainersAndVolumes();
    refresher = setInterval(updateContainersAndVolumes, 10000);
};

exports.interract = function (request) {
    if (request.install) {
        installDocker();
    } else if (request.runImage) {
        runImage(request.runImage, request.tag, request.volume, request.inputs);
    } else if (request.getTags) {
        getTags(request.getTags)
            .then(tags => uiCallback({
                tags: tags
            }));
    } else if (request.rmContainer) {
        rmContainer(request.rmContainer);
    } else if (request.rmVolume) {
        rmVolume(request.rmVolume);
    }
};

exports.reset = () => {
    state = {};
    clearInterval(refresher);
};

var checkDocker = () => {
    sshell.runCmdAsRoot(con, 'docker --version')
        .then(() => {
            state.installed = true;
            uiCallback({
                state: state
            });
            updateContainersAndVolumes();
        }, () => {
            state.installed = false;
            uiCallback({
                state: state
            });
        });
};

var installDocker = () => {
    state.installInProgess = true;
    uiCallback({
        state: state
    });
    return sshell.runBashScriptAsRoot(con, installScript)
        .then((s) => {
            state.installInProgess = false;
            checkDocker();
            openModal(
                'Docker installation successed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );
        })
        .catch(s => {
            state.installInProgess = false;
            checkDocker();
            openModal(
                'Docker installation failed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );
        })
        .then(() => sshell.runCmdAsRoot(con, 'systemctl enable docker')) // Required for Fedora & CentOS
        .then(() => sshell.runCmdAsRoot(con, 'systemctl start docker')) // Possible bug in docker install script
        .catch(() => {}); // Supress
};

var runImage = (img, tag, volume, inputs) => {
    var params = {
        volumes: new Map(),
        ports: {
            tcp: new Map(),
            udp: new Map()
        }
    };

    var cmd = 'docker run -d --restart=always';

    var imgFull = img;
    if (tag && tag.length > 0 && tag != 'latest') {
        imgFull += ':' + tag;
    }

    var imgEscaped = img.replace(/[^a-zA-Z0-9-]/g, '-');

    return sshell.runCmdAsRoot(con, 'docker pull ' + imgFull) // Pull image
        .then(() => sshell.runCmdAsRoot(con, 'docker inspect ' + imgFull)) // Inspect image for ports and volumes
        .then((data_) => { // Parse image info
            var config = JSON.parse(data_)[0].Config;
            for (var port in config.ExposedPorts) {
                if (config.ExposedPorts.hasOwnProperty(port)) {
                    var p = /([\d\-]+)\/(tcp|udp)/i.exec(port);
                    if (p[2] == 'tcp') {
                        params.ports.tcp.set(p[1], parseInt(p[1]));
                    } else if (p[2] == 'udp') {
                        params.ports.udp.set(p[1], parseInt(p[1]));
                    } else {
                        log.error('Unknow port notation ' + port);
                    }
                }
            }
            var volArray = [];
            if (profiles.volumes.hasOwnProperty(img)) {
                volArray = profiles.volumes[img]; // Replace image-defined volumes with profile-defined
            } else {
                for (var vol in config.Volumes) {
                    if (config.Volumes.hasOwnProperty(vol)) {
                        volArray.push(vol);
                    }
                }
            }
            volArray.forEach(i => {
                var v = i.slice(1).replace(/\//g, '_');
                params.volumes.set(i, imgEscaped + '_' + v);
            });

            if (volume && volume.length > 0 && params.volumes && params.volumes.size > 0) { // Attach custom volume
                params.volumes.set(params.volumes.keys().next().value, volume);
            }
            return params;
        })
        .then(() => sshell.runCmdAsRoot(con, usedPortsCmd)) // Get used ports
        .then((data) => { // Resolve possible ports confilcts
            var lines = data.split('\n');
            var tcp = lines.filter((s) => /tcp/i.test(s)).map((s) => parseInt(s.split(',')[0])); // Used tcp ports
            var udp = lines.filter((s) => /udp/i.test(s)).map((s) => parseInt(s.split(',')[0])); // Used udp ports

            params.ports.tcp.forEach((v, k) => {
                while (1) {
                    if (tcp.includes(v)) {
                        v += 1;
                        continue;
                    } else {
                        tcp.push(v);
                        break;
                    }
                }
                params.ports.tcp.set(k, v);
            });

            params.ports.udp.forEach((v, k) => {
                while (1) {
                    if (udp.includes(v)) {
                        v += 1;
                        continue;
                    } else {
                        tcp.push(v);
                        break;
                    }
                }
                params.ports.udp.set(k, v);
            });

            return params;
        })
        .then(() => {
            params.ports.tcp.forEach((v, k) => {
                cmd += ' -p ' + v + ':' + k + '/tcp';
            });
            params.ports.udp.forEach((v, k) => {
                cmd += ' -p ' + v + ':' + k + '/udp';
            });

            params.volumes.forEach((v, k) => {
                cmd += ' -v ' + v + ':' + k;
            });

            if (profiles.parameters.hasOwnProperty(img)) {
                var customParameters = profiles.parameters[img];
                for (var i in inputs) {
                    if (inputs.hasOwnProperty(i)) {
                        customParameters = customParameters.replace(new RegExp('\{\{INPUT_' + i.toUpperCase() + '\}\}', 'g'), inputs[i]);
                    }
                }
                cmd += ' ' + customParameters;
            }

            cmd += ' -e VIRTUAL_HOST="' + imgEscaped + '.*"'; // Subdomian for jwilder/nginx-proxy
            cmd += ' --add-host="host:172.17.0.1"'; // Every container can use `host` to access others exposed
            cmd += ' ' + imgFull;
            return sshell.runCmdAsRoot(con, cmd);
        })
        .then((s) => {
            s = cmd + '\n' + s;
            openModal(
                'Docker image run successed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );
        })
        .catch((s) => {
            s = cmd + '\n' + s;
            openModal(
                'Docker image run failed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );
        })
        .then(updateContainersAndVolumes)
        .then(() => sshell.runCmdAsRoot(con, 'docker images -q |xargs docker rmi')) // Clean up unused images
        .catch(() => {}); // Supress
};

var updateContainersAndVolumes = () => {
    // Containers
    sshell.runCmdAsRoot(con, "docker ps --no-trunc --format '{\"name\":\"{{.Names}}\",\"image\":\"{{.Image}}\",\"ports\":\"{{.Ports}}\",\"status\":\"{{.Status}}\",\"volumes\":\"{{.Mounts}}\"}'")
        .then((data) => {
            var lines = data.split('\n').filter(s => s.length > 0);
            var containers = [];
            lines.forEach((line) => {
                containers.push(JSON.parse(line));
            });
            uiCallback({
                containers: containers
            });
        })
        .catch((e) => log.error(e));

    // Volumes
    sshell.runCmdAsRoot(con, "docker volume ls --format '{{.Name}}'")
        .then((data) => {
            var lines = data.split('\n');
            var volumes = lines.map(s => s.trim()).filter(s => s.length > 0);
            uiCallback({
                volumes: volumes
            });
        })
        .catch((e) => log.error(e));
};

var rmContainer = c => {
    sshell.runCmdAsRoot(con, 'docker rm -f ' + c)
        .then(updateContainersAndVolumes)
        .catch(s => {
            openModal(
                'Docker container remove failed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );
            log.error(s);
        })
        .then(() => sshell.runCmdAsRoot(con, 'docker images -q |xargs docker rmi')) // Clean up unused images
        .catch(() => {}); // Supress
};

var rmVolume = v => {
    sshell.runCmdAsRoot(con, 'docker volume rm ' + v)
        .then(updateContainersAndVolumes)
        .catch(s => {
            openModal(
                'Docker container remove failed!',
                '<textarea class="form-control" rows="10" style="font-family:monospace;white-space: pre;" disabled>' + s + '</textarea>'
            );
            log.error(s);
        });
};

imageLoader = new Promise(
    (resolve, reject) => {
        var loadImages = url => {
            if (!url) {
                images = profiles.images;
                url = 'https://hub.docker.com/v2/repositories/library/?page=1&page_size=100';
            }

            https.get(url, resp => {
                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                resp.on('end', () => {
                    var response = JSON.parse(data);
                    images = images.concat(response.results.map((i) => i.name));
                    if (/^http/i.test(response.next)) {
                        loadImages(response.next);
                    } else {
                        resolve(images);
                    }
                });

            }).on('error', (err) => {
                log.error(err);
                reject(err);
            });
        };
        loadImages();
    }
);

var getTags = (img) => {
    var user = 'library';
    if (img.includes('/')) {
        var parts = img.split('/');
        user = parts[0];
        img = parts[1];
    }

    return new Promise(
        (resolve, reject) => {
            if (imgTags.has(img)) {
                resolve(imgTags.get(img));
            }

            var tagsList = [];

            var loadTags = url => {
                if (!url) {
                    tags = [];
                    url = 'https://hub.docker.com/v2/repositories/' + user + '/' + img + '/tags/?page=1&page_size=100';
                }

                https.get(url, resp => {
                    let data = '';
                    resp.on('data', (chunk) => {
                        data += chunk;
                    });
                    resp.on('end', () => {
                        var response = JSON.parse(data);
                        tagsList = tagsList.concat(response.results.map((i) => i.name));
                        if (/^http/i.test(response.next)) {
                            loadTags(response.next);
                        } else {
                            imgTags.set(img, tagsList);
                            resolve(tagsList);
                        }
                    });

                }).on('error', (err) => {
                    log.error(err);
                    reject(err);
                });
            };
            loadTags();
        }
    );
};
