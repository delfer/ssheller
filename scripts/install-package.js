var sshell = require('../sshell');
var fs = require('fs');

var script = fs.readFileSync('scripts/pacapt', 'UTF-8');

exports.load = scripts => {
  scripts.install_package = (con, package) => {
    return sshell.runBashScriptAsRoot(con, script, '--noconfirm -Sy || true') // true to ignore return code; yum will return 100 if have packages to upgrade
      .then(() => sshell.runBashScriptAsRoot(con, script, '--noconfirm -S ' + package));
  };
};
