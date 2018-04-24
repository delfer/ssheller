# SSHeller

Install software by just single click!

![SSHeller gif](https://media.giphy.com/media/kiIZLgTE2oJKGHNhjX/giphy.gif)

## OpenVPN quick start

1. Register on DigitalOcean by [referral link](https://m.do.co/c/434858cf5322) (support us by click and you will get $10 bonus)
1. Activate account with payment `$5` by PayPal or `$1` by Credit Card (Debit Cards not accepted)
1. Depending on payment type you will get `$15` or `$11` (<b>+</b>`$10` <b>bonus</b>)
1. From the `Dashboard` click `Create`->`Droplets`
1. Choose any supported image (I personally prefer `Fedora 27` and sometimes `Debian 9`)
1. Choose the size `1Gb 1vCPU 25GB 1Tb $5/mo` or any other
1. Choose the datacenter region what nearest to you (`Amsterdam` for European part of Russia)
1. Click `Create` button
1. Whait for e-mail from DigitalOcean with IP and `root`'s password
1. Of course, install SSHeller from [releases page](https://github.com/delfer/ssheller/releases)
1. Launch SSHeller, click `Add`, fill `Name`, `Host`(IP), `User`(root), `Password` from e-mail and press `Save`
1. Press `Dashboard` on the top an choose `OpenVPN` and click `Install` button
1. Wait for some time. Depend of your lucky and server it may take from 3 minutes to 30...
1. After installation completes, Under `Install` button you will find <b>client.ovpn</b> - click on it and save it on a disk
1. Also you can add new OpenVPN user by filling name and pressing `Add`
1. Download OpenVPN client for [Windows](https://openvpn.net/index.php/open-source/downloads.html), [MacOS](https://tunnelblick.net/downloads.html), [Android](https://play.google.com/store/apps/details?id=net.openvpn.openvpn), [iOS](https://itunes.apple.com/us/app/openvpn-connect/id590379981?mt=8) or install with your package manager on `Linux`
1. Enjoy!
    1. On `Windows` you should put your `client.ovpn` into `C:\Program Files\OpenVPN\config` and run by icon in tray
    1. On `Linux` run `sudo openvpn client.ovpn`
    1. On other devices open `client.ovpn` file from inside of application

## Downloads

Download SSHeller from [releases page](https://github.com/delfer/ssheller/releases)
- `SSHeller Setup X.X.X.exe` - Windows installer
- `SSHeller-X.X.X.dmg` - MacOS installer
- `SSHeller-X.X.X-x86_64.AppImage` - Linux installer: make executable and run
- `SSHeller_X.X.X_amd64.snap` - ALternative Linux installer

## Building from sources

Requirements:
- Node.js 8.2.1 or newer
- NPM 5.6.0

Build process: `npm i && electron-builder -lmw`


## Features

- Free and open source! You can use, modify and sell this program
- Works with VPS, VDS, cloud servers, dedicated servers, VMWare/VirtualBox/qemu/etc virtual machines, kvm, OpenVZ etc. (OpenVPN requires tun device)
- Authorize by password or private key
- Can get root rights by `sudo` or `su`
- Will renew your expired password in background (`but by security reasons you must change your password after`)
- Automatically reconnect on connection lost
- Shows system status, provide buttons to install OpenVPN and reboot server
- Cross-platform: Windows, MacOS and Linux
- Have powerful API and can be extended by plugins

## Security

- Open source: you can look sources and build it by yourself 
- Your passwords, keys, and all other data stored on the disk encrypted by AES 256
- Passwords in logs replaces to `XXX`
- OpenVPN use powerful  `3072 bits` keys

## Logs

In case of any problems, you can read and share your logs:
- Windows: `C:\Users\<User>\AppData\Roaming\sheller` or `C:\Users\<User>\AppData\Local\sheller`
- Linux: `~/.config/SSHeller`
- MacOS: `/Users/<User>/Library/Application Support/SSHeller/`

## Tested on DigitalOcean images

- Ubuntu 14.04.5 x32 - <b>OK</b>
- Ubuntu 14.04.5 x64 - <b>OK</b>
- Ubuntu 16.04.4 x32 - <b>OK</b>
- Ubuntu 16.04.4 x64  - <b>OK</b>
- Ubuntu 17.10 x64 - <b>OK</b>
- Fedora 26 x64 - <b>OK</b>
- Fedora 27 x64 - <b>OK</b>
- Debian 7.11 x32 - `OpenVPN failed to install`
- Debian 7.11 x64 - `OpenVPN failed to install`
- Debian 8.10 x32 - <b>OK</b>
- Debian 8.10 x64 - <b>OK</b>
- Debian 9.4 x64 - <b>OK</b>
- CentOS 6.9 x32 - <b>OK</b>
- CentOS 6.9 x64 - <b>OK</b>
- CentOS 7.4 x64 - <b>OK</b>
- FreeBSD 10.3 x64 - `unsupported`
- FreeBSD 10.3 x64 zfs - `unsupported`
- FreeBSD 10.4 x64 - `unsupported`
- FreeBSD 10.4 x64 ZFS - `unsupported`
- FreeBSD 11.1 x64 - `unsupported`
- FreeBSD 11.1 x64 ZFS - `unsupported`
## How to help project

- Send [Pull Reqests](https://github.com/delfer/ssheller/pulls)
- Report [Issues and Proposuals](https://github.com/delfer/ssheller/issues)
- Register on DigitalOcean by [referral link](https://m.do.co/c/434858cf5322)
## Credits

Software/libs used:
- [TauCharts](https://www.taucharts.com/)
- [Pacapt](https://github.com/icy/pacapt)
- [OpenVPN-install by Angristan](https://github.com/Angristan/OpenVPN-install)
- [OpenVPN-install by Nyr](https://github.com/Nyr/openvpn-install)
- [Electron](https://electronjs.org/)
- [Electron-builder](https://www.electron.build/)
- [Bootstrap](https://getbootstrap.com/)

## License

MIT
