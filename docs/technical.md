## Hidden folder

Dat stores its data in a hidden folder that is stored by default in the user's home directory.

```
~/.dat
```

Because of this, data is only ever downloaded once. That is, if you have multiple projects that use the same data (perhaps at different versions) on the same machine, dat will first check the global `.dat` folder to see if the data has already been downloaded before querying the network.

The global `.dat` folder has:

```
$ ls ~/.dat
db
config
```

`dat` will first check `/root/.dat` and then `~/.dat`. So, if you want to have the .dat available globally, move the folder to `/root/.dat`.
