var sshell = require('../sshell');
var fs = require('fs');
const path = require('path');

var script;

fs.readFile(path.join(__dirname, 'pacapt'), 'utf8', function (err, out) {
  if (!err) {
    script = out;
  }
});

exports.load = scripts => {
  scripts.install_package = (con, package) => {
    return sshell.runBashScriptAsRoot(con, script, '--noconfirm -Sy || true') // true to ignore return code; yum will return 100 if have packages to upgrade
      .then(() => sshell.runBashScriptAsRoot(con, script, '--noconfirm -S ' + package));
  };
};
