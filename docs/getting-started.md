# Getting started with dat

**Note** The currently available version of Dat is the Alpha release. Our target audience with the Alpha is early adopters and developers. If you are unsure if Dat is a good fit for your use case, let us know in IRC, on Twitter (@datproject) or by opening an issue in this repository.

Here, we discuss the fastest way to publish your data. We assume you have the following materials:

  1. Access to a server or a heroku account
  2. Raw JSON, CSV, or blob data
  3. A terminal

### What you need to know

Dat is a project that seeks to set up better tools to store, sync, and share your data.

A `dat` includes both a *tabular* and a *blob* store.

* The *tabular store* is just a table. As the data changes, it is versioned so that you can always go back in time. **Data is never deleted from a dat**.

* The *blob store* is for data that you can't necessarily fit into a cell. This could be any attachement, such as an image.

You can read more details about how dat works in our [importing guide](https://github.com/maxogden/dat/blob/master/docs/importing.md).


### Step 1: Setting up a dat server

How big is your data?

  * **Under 10,000 rows or 25MB**: You can use [heroku-dat-template](https://github.com/bmpvieira/heroku-dat-template/blob/master/README.md) to deploy your data FOR FREE! Follow the instructions and then come back here for step 2.

  * **More than 10,000 rows or 25MB:**  You can buy [digital ocean](https://www.digitalocean.com/) droplet for a cheaper price than heroku, or find a friend (or IT specialist!) that can help you out.


If you don't have access or time for a server, you could just do:

  ```bash
  $ dat init
  ```

And then start the server on your computer:

  ```bash
  $ dat listen
  ```

### Step 2: Clone the dat

Do you have a dat URL?

If you do, you should first clone it.

  ```bash
  $ dat clone http://mydat.herokuapp.com
  Elapsed      : 2 s
  Pulled       : 0 B       (0 B/s)
  changes : 0
  blobs   : 0

  Clone from remote has completed.
  ```

You can take a look at the contents -- a `dat.json` file and a .dat/ folder with the dat database.

  ```bash
  $ cd mydat.herokuapp.com
  $ ls -a
  dat.json .dat/
  ```

And you can even see what's in it

  ```bash
  $ dat cat

  ```

But nothing comes out. You actually need to put data in it first!

  ```bash
  $ ls
  my-data.csv

  $ dat import my-data.csv --csv
  Elapsed      : 0 s
  Parsed       : 78.13 kB  (78.13 kB/s)
  changes : 435

  Done
  ```

So now, you'll need to push it to `http://mydat.herokuapp.com` so other people can get access.

  ```bash
  $ dat push http://mydat.herokuapp.com
  Access denied.
  ```

You have to make sure you put your username and password in the URL. (*We'll be changing this soon*)

[I forgot my password.](https://github.com/maxogden/dat/blob/master/docs/forgot-password.md)

Okay, so once you get your password:

  ```bash
  $ dat push http://admin:iamapassword@mydat.herokuapp.com
  Elapsed      : 6 s
  Pushed       : 95.53 kB  (0 B/s)
   - changes : 435
   - blobs   : 0

  Push to remote has completed.
  ```

Now, you can go to `http://mydat.herokuapp.com` and other people can `dat clone` your data. Boom!






