# COOKBOOK!


## How do I set up my dat so other people can `dat clone`?

Dat is transport agnostic. Here, we will go over two ways to set up an endpoint for your dat -- ssh, and http.

### Using SSH to set up a dat host

SSH has a lot of benefits -- it doesn't require a running process, and you can easily use highly-secure authentication.

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

However, we recommend that you set up your dat on a dedicated server so that people can clone from you even when your computer is off. If using linux, you'll need to [make sure you have an ssh port open](http://www.cyberciti.biz/faq/linux-open-iptables-firewall-port-22-23/).

### Using HTTP to set up a dat host

A dat can also be hosted through http. We include a command, `dat serve`, which begins an http listener that supports clone, pull, and push.

```
$ dat init
$ dat serve
Listening on port 6442

```

When this is typed, the process will be running and the terminal will hang. If you cancel the command, the endpoint will close. To have the endpoint running all of the time, you'll need to set up routes. We recommend `taco` with nginx:

```
$ npm install -g taco-nginx
$ taco-nginx --name <servicename> dat serve --port=$PORT
```

You then might want to use process monitoring so that if the process fails for some reason, it will get automatically restarted by the system. There are a variety of ways to do this.

## How do I set up authentication on my dat?

We recommend SSH keys for access control. Here is a [good tutorial on setting up ssh authentication to allow ssh access only to certain individuals](https://www.digitalocean.com/community/tutorials/how-to-set-up-ssh-keys--2).


## How do I allow read-only access to the dat?

There currently is no support for read-only mode, although it is on the roadmap and would welcome PRs!