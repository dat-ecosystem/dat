# COOKBOOK!

## How do I set up my dat so other people can `dat clone`?

### dat over SSH

SSH has a lot of benefits -- it doesn't require running a persistent dat daemon process, and you can easily use highly-secure authentication.

```
$ pwd
/Users/karissa/dats/cities
$ dat init
$ dat import ...
```

As soon as I've done `dat init`, another user can `clone` my dat.

```
$ dat clone ssh://169.32.1.2:/Users/karissa/dats/cities
Clone from remote has completed.
```

On OSX, it is easy to set up an ssh endpoint: [see this tutorial](https://support.apple.com/kb/PH18726?locale=en_US).

However, we recommend that you set up your dat on a dedicated server so that people can clone from you reliably. If using linux, you'll need to [make sure you have an ssh port open](http://www.cyberciti.biz/faq/linux-open-iptables-firewall-port-22-23/).

### dat over HTTP

A dat can also be hosted through http. We include a command, `dat serve`, which begins an http listener that supports clone, pull, and push.

```
$ dat init
$ dat serve
Listening on port 6442
```

When this is typed, the process will be running and the terminal will hang. If you cancel the command, the endpoint will close. To have the endpoint running all of the time, you'll need to use additional tools to daemonize the process (it varies depending on your operating system)

##### ubuntu init script

See `dat.conf` in this directory for an example ubuntu init script that you can use to easily control a dat from Ubuntu.

You just need to edit it (customize it with your settings), save it as `/etc/init/dat.conf` and then you will be able to run `sudo start dat` to start a dat serve process.

##### nginx

Nginx is a commonly used reverse proxy that you can use to host multiple services from one machine, and to do things like add https support to normally http-only services.

The easiest way to use dat with nginx is to use our module [`taco-nginx`](https://www.npmjs.com/package/taco-nginx).

`taco-nginx` is a bash script that runs a server and forwards a subdomain to it using nginx when it listens to $PORT.

So when you run this command:

```
taco-nginx --name mydatserver dat serve --readonly
```

`taco-nginx` will generate this nginx configuration file and automatically load it into nginx immediately:

```
upstream mydatserver {
  server 127.0.0.1:44034;
}
server {
  listen 443;
  listen 80;
  server_name mydatserver.*;
  location / {
    proxy_pass http://mydatserver;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_http_version 1.1;
    client_max_body_size 0;
  }
}
```

The port will be random every time, and `taco-nginx` will spawn `dat serve --readonly` with the `PORT` environment variable set to the correct port.

You can combine `taco-nginx` and `dat.conf` to make dat automatically deploy to nginx.

##### psy

If you don't want to use the built in process monitoring supplied by Ubuntu init scripts, check out the [`psy`](https://www.npmjs.com/package/psy) lightweight process monitor.

Here's an example command that runs a dat server using `taco-nginx` and `psy` (with debug logging enabled):

```
psy start -n mydatserver --env.DEBUG=dat-serve --cwd=/home/admin/src/sleep-irc/data -l /home/admin/logs/mydatserver.logs -- taco-nginx --name mydatserver dat serve --readonly
```

`psy` lets you view status of and start/stop/restart processes:

```
admin:~$ psy ls
mydatserver  running  22654  about 22 hours ago  taco-nginx --name mydatserver dat serve --readonly
```

## How do I set up authentication on my dat?

We recommend SSH keys for access control. Here is a [good tutorial on setting up ssh authentication to allow ssh access only to certain individuals](https://www.digitalocean.com/community/tutorials/how-to-set-up-ssh-keys--2).

## How do I allow read-only access to the dat?

If you aren't using SSH, you can do this via https using the `--read-only` flag:

```
dat serve --read-only
```

## How do I use a compound key in dat?

A compound key might be something like 'city', 'state', and 'zip code'. This is where any on its own isn't uniquely identifiable to a row, but all together will create a unique key.

Here, we will create a compound key using these three:

```
dat import cities.csv -d cities -k city -k state -k zipcode
```

Dat will sort these keys and use them with a `+` delimiter, so a row with 'oakland', 'ca', '94607' might be 'oakland+ca+94607'.

## How do I connect a different backend to dat?

In your `package.json` file, under `dat`, add a `backend` entry. Example for `SQL` variants:

```
{
  "name": "mydat",
  "dat": {
    "backend": {
      "module": "sqldown",
      "env": "DAT_TABULAR_DATABASE"
    }
  }
}
```

### Options

Every addon has two available configuration arguments right now:

`module`: Any npm module that implements the [AbstractLevelDOWN api](https://github.com/Level/abstract-leveldown) will be compatible with dat. You'll need to install this module by typing `npm install <module> [--save]`.

`env`: The environment variable that represents the `path` or `url` argument to the backend.


### Supported Addon Types

`backend`: where tabular data is stored.
`blobs`: *coming soon*
