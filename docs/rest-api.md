# dat REST API

You can start the dat REST server from the CLI with `dat listen` or from JS with `dat.listen()`

For concrete examples of using this API from Node check out the [REST API tests](https://github.com/maxogden/dat/blob/master/test/tests/rest.js).

## GET /

Serves the [dat-editor](http://github.com/maxogden/dat-editor) web app

## GET /api

Returns JSON about this dat. Example:

```
{
  dat: "Hello",
  version: "5.0.5",
  changes: 1031142,
  name: "nextbus",
  description: "Nextbus dataset",
  publisher: "maxogden",
  rows: 1031142,
  approximateSize: {
    rows: "174.94 MB"
  }
}
```

- `version` is the dat version from dat's package.json
- `changes` is the latest change sequence number (used for replication)
- `name` is taken from the dat.json name field if present
- `description` is taken from the dat.json description field if present
- `publisher` is taken from the dat.json publisher field if present
- `rows` is the number of rows in the dat tabular store

## GET /api/rows

This is an API on top of [createReadStream](js-api.md#createreadstream). 

### Options

Options should be specified in the query string (e.g. `?foo=bar`)

All options from [createReadStream](js-api.md#createchangesstream) are supported.

With this API the default `limit` is 50 and data will be returned as follows:

```
{
  "rows": [
    {
      "key": "chxtd4x9k00007ma5eoaojisj",
      "version": 1,
      "routeTag": "72R"
    },
    {
      "key": "chxtd4x9m00017ma5yu98dw02",
      "version": 1,
      "routeTag": "77R"
    }
  ]
}
```

## GET /api/rows/:key

Returns JSON representation of the row for `key`, or a 404 if not found.

## POST /api/rows

Creates a new row. Data must be JSON. Internally does a [put](https://github.com/maxogden/dat/blob/master/docs/js-api.md#put) and therefore follows the same versioning semantics.

In response you will receive either a conflict error:

```
{"conflict":true,"error":"Document update conflict. Invalid version","status":409}
```

Or the newly stored row contents:

```
{"key":"foo","version":1}
```

## GET /api/rows/:key/:filename

Returns a stream of bytes for the file matching `filename` that is attached to `key`, or a 404 if not found.

## POST /api/rows/:key/:filename

Uploads a blob to a row by key.

- The row must exist already.
- You must also specify the current version of the existing row in the querystring as `version`

e.g. if there is a key called `foo` that is currently at version 1, and you want to attach `photo.jpg` to it you would do:

```
POST /api/rows/foo/photo.jpg?version=1
```

Then the contents of your POST upload body will be stored in the dat blob store, and the metadata will be written to the `foo` key under the `blobs` field, which will cause `foo` to increase to version 2. You will receive a conflict or the updated row data as a response (the same as `POST /api/rows`).

## GET /api/session

Returns JSON about the current session. Authentication in dat is currently implemented using HTTP Basic Auth and Cookie based sessions.

If there is an admin username and password set on this dat then only the admin user will be able to edit any data in dat, but all data will still be readable.

If you have a valid session you will receive your session token:

```
{
  "session":"b0d7a9693f61717f72a2d96e00adf8c"
}
```


If you do not have a valid session you will receive:

```
{
  error: "Unauthorized",
  loggedOut: true
}
```

To create a new session do a GET to `/api/session` with HTTP basic auth, e.g. your `authorization` header should look like this:

```
authorization: Basic dXNlcjpwYXNz
```

...where `dXNlcjpwYXNz` is base64 encoded `user + ':' + pass`.

## GET /api/login

Same semantics as `/api/session` except the `WWW-Authenticate` header on responses will be set to `Basic realm="Secure Area"` which will make a login form appear in web browsers.

## GET /api/logout

Destroys session on the server and clears session cookie in client.

## GET /api/changes

Returns JSON of the [changes feed](js-api.md#createchangesstream).

### Options

Options should be specified in the query string (e.g. `?foo=bar`)

All options from [createChangesStream](js-api.md#createchangesstream) are supported in addition to:

- `style` (default `array`) - how data should be returned. Examples below:

`newline`:

```
{"key":"chxtd4x9k00007ma5eoaojisj","change":1,"version":1}
{"key":"chxtd4x9m00017ma5yu98dw02","change":2,"version":1}
```

`array`:

```
[{"key":"chxtd4x9k00007ma5eoaojisj","change":1,"version":1},{"key":"chxtd4x9m00017ma5yu98dw02","change":2,"version":1}]
```

`object`:
  
```
{"rows":[{"key":"chxtd4x9k00007ma5eoaojisj","change":1,"version":1},{"key":"chxtd4x9m00017ma5yu98dw02","change":2,"version":1}]}
```

`sse` (Server Sent Events):

```
event: data
data: {"key":"chxtd4x9k00007ma5eoaojisj","change":1,"version":1}

event: data
data: {"key":"chxtd4x9m00017ma5yu98dw02","change":2,"version":1}

```

## GET /api/csv

Streams out CSV data of the latest version of all rows in the tabular store.

## POST /api/bulk

Streams tabular data into the tabular data store using a [writeStream](js-api.md#createwritestream).

Data can be either newline-delimited JSON (with content-type `application/json`) or CSV (with content-type `text/csv`).

The response will be a stream of newline-delimited JSON objects.

If your data has a schema that does not match the existing schema you will receive a 400 response with:

```
{"type": "writeStreamError", "message": "Column mismatch"}
```

Otherwise you will receive one object for every stored row that has the row's key and version:

```
{"key":"chxu776k106hpjoq4ssk8cr8c","version":1}
{"key":"chxu776k106hqjoq4mvp36zfg","version":1}
{"key":"chxu776k106hrjoq42nv9ay99","version":1}
```

## GET /api/metadata

Returns a JSON object containing table metadata, including the tabular store schema and other capabilities. Used during replication.

Example response:

```
{
  "columns": [
    {"name": "lastUpdated", "type": "json"},
    {"name": "lat", "type": "json"},
    {"name": "lon", "type": "json"}
  ],
  "liveBackup": false
}
```

## GET /api/manifest

Returns a JSON object containing a manifest of the underlying tabular storage API, generated by [level-manifest](https://www.npmjs.org/package/level-manifest). Used during RPC.

## POST /api/rpc

A [multilevel](http://npmjs.org/multilevel) server endpoint. Dat has a multilevel client built in for RPC. You can also roll your own multilevel client and connect here.

## GET /api/replicator/receive
## GET /api/replicator/send
