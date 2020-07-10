# dns-proxy-drop-a

A DNS proxy which blocks lookups for IN A records. I'm using it on a Mythic
Beasts hosted Raspberry Pi to force node.js to use IPv6. Without this node.js
prefers IPv4 addresses - which don't generally route anywhere useful in this
environment.

Mythic Beasts excellent 
[hosted Raspberry Pis](https://www.mythic-beasts.com/order/rpi) are
IPv6 to the internet. They have an IPv4 gateway configured but it doesn't route
to the internet. This isn't much of a problem in practice; there are various
proxies and gateways so that, for example, the Pi can access IPv4 sites via
DNS64 and a NAT64 gateway.

This works well for most software but node.js is (I think) confused by the
presence of an IPv4 route and tends to use that in preference to the IPv6
gateway. That means that npm doesn't work and most node.js code that attempts
to connect to a remote service will also fail.

By stripping all ```IN A``` requests ```dns-proxy-drop-a``` forces node.js to use
IPv6 which, thanks to the DNS64, NAT64 setup works even for domains that are
IPv4 only.

## A Better Way?

I don't know if this is the best way to solve this problem. I found a few
instances of people having problems with node.js in dual stack setups but no
apparent solution. If anyone can think of a better workaround please let me
know.

## Setup

```dns-proxy-drop-a``` runs as a local DNS proxy. I use
[pm2](https://pm2.keymetrics.io) to start it at boot time. It runs under an
unprivileged account and uses ```authbind``` to allow it listen on privileged
port 53.

## Installation

If you haven't already installed node.js you can do it like this:

```sh
$ curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
$ sudo apt install nodejs
```

You'll also need ```pm2``` and ```authbind```:

```sh
$ sudo apt install -y authbind
$ sudo npm install -g pm2
```

_Note:_ You may not need to use `sudo` on the `npm` command if your npm
global prefix is user writeable.

### Install node dependencies

Next we need to install proxy's javascript dependencies. We're going to use
`npm` to do that. However `npm` won't work just yet - it has the problem that
`dns-proxy-drop-a` is designed to solve. To get `npm` working we need to
temporarily add an IPv6 address for `registry.npmjs.org`. Add the following
line to `/etc/hosts`:

```
2606:4700::6810:1923 registry.npmjs.org
```

Now go to the directory where you have this code and install the dependencies:

```sh
$ cd dns-proxy-drop-a
$ npm install
```

And check that the proxy will run:

```sh
$ node bin/proxy.js 5353
```

While it's running you will be able to query it like this:

```sh
$ dig @localhost -p 5353 hexten.net a
$ dig @localhost -p 5353 hexten.net aaaa
```

You should see that request for A records return nothing.

If that is all working you can remove or comment out the entry for
`registry.npmjs.org` in `/etc/hosts`. Once the proxy is running you
shouldn't need that hack again.

### Setup authbind

We'll use `authbind` so we can run the proxy as an unprivileged user and still
have it bind to port 53. You can learn more about `pm2` + `authbind` in the
[pm2 documentation](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#listening-on-port-80-wo-root).
First we'll give our account access to port 53:

```sh
$ sudo touch /etc/authbind/byport/53
$ sudo chown $USER /etc/authbind/byport/53
$ chmod 755 /etc/authbind/byport/53
```

### Setup pm2

We need to make sure `pm2` always runs under `authbind`. First edit your
`~/.bashrc` to include an alias for `pm2`:

```sh
alias pm2='authbind --deep pm2'
```

Either `source ~/.bashrc` or log out and back in again so the alias is
registered. Next we need to make `pm2` start at boot:

```sh
$ pm2 startup # then follow the instructions it displays
```

`pm2` will give you a command that will install a `systemd` startup script. The
default script doesn't know about `authbind` so we have to make some changes.
Open `/etc/systemd/system/pm2-$USER.service` in your editor and find the lines that look
like this:

```
ExecStart=/usr/local/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/usr/local/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/usr/local/lib/node_modules/pm2/bin/pm2 kill
```

(Your pathnames may vary)

Change them to this:

```
ExecStart=/usr/bin/authbind --deep /usr/local/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/usr/bin/authbind --deep /usr/local/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/usr/bin/authbind --deep /usr/local/lib/node_modules/pm2/bin/pm2 kill
```

That ensures `pm2` always runs under `authbind` and any processes it launches
will be able to bind to port 53.

### Launch the proxy

Now we can start `dns-proxy-drop-a`. I use `pm2` to run three instances in
cluster mode like this:

```sh
$ cd dns-proxy-drop-a
$ pm2 start bin/proxy.js -i 3 --name dns-proxy-drop-a
$ pm2 save  # start on boot
```

Use ```pm2 ps``` to see process status and ```pm2 log dns-proxy-drop-a``` to
follow the proxy server's logs.

You should now be able to query the proxy server:

```
$ dig +short @localhost hexten.net a     # no IN A result
$ dig +short @localhost hexten.net aaaa  # NAT64 of real IN A
2a00:1098:0:82:1000:3a:bc28:4394
```

Next we're going to configure your Pi to use the proxy for all its DNS, but
before that I recommend restarting the Pi and making sure that the proxy has
started up and is listening on port 53. Assuming that works edit
`/etc/resolv.conf` to contain:

```
nameserver 127.0.0.1
```

Now any attempts to resolve IPv4 A records will be silently dropped and node.js
should be able to connect to the internet.

## Checklist

- [x] remove `registry.npmjs.org` from `/etc/hosts`
- [x] `authbind` port permission in `/etc/authbind/byport/53`
- [x] `pm2` running under `authbind` (startup script & alias)
- [x] ```pm2 save``` so that proxy starts on reboot
- [x] add ```nameserver 127.0.0.1``` to `/etc/resolv.conf`

