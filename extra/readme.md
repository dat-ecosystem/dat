## extra stuff

### deployment

To access a dat over http, you can run `dat serve`

To access a dat over ssh, you don't need to run a process, ssh just needs to be able to spawn `dat`

#### ubuntu

See `dat.conf` in this directory for an example ubuntu init script.

##### nginx

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

### contributing

send a pull request to this document if you have recommend solutions for deployment on other platforms
