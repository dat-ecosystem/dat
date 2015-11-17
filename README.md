# dat

Version, publish, and sync data.

## Install

```npm install -g dat```


## Example

Go into a directory and type

```
$ cd mydata/
$ dat publish
bd3423sdf2342ksdjf238422k3
```

You are now publishing that data from your computer and it will be publically accessible. Your friend can get that data like this:

```
$ dat bd3423sdf2342ksdjf238422k3 </path/to/location>
```

It will start downloading the data into /path/to/location.

## In theory, one day:

```
$ dat login
Username: karissa
Password: ********
$ dat publish genome
karissa/genome
```

```
dat karissa/genome/path/to/file/i/want.txt
```
