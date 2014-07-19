# dat REST API

You can start the dat REST server from the CLI with `dat listen` or from JS with `dat.listen()`

## GET /

Serves the [dat-editor](http://github.com/maxogden/dat-editor) web app

## GET /api

Returns JSON about this dat. example:

```
{
  dat: "Hello",
  version: "5.0.5",
  changes: 1031142,
  name: "nextbus",
  rows: 1031142,
  approximateSize: {
    documents: "174.94 MB"
  }
}
```

- `version` is the dat version from dat's package.json
- `changes` is the latest change sequence number (used for replication)
- `name` is taken from the dat.json name field if present
- `rows` is the number of rows in the dat tabular store

## GET /api/:key

Returns JSON representation of the row for `key`, or a 404 if not found.

## GET /api/:key/:filename

Returns a stream of bytes for the file matching `filename` that is attached to `key`, or a 404 if not found.

## GET /api/session

Returns JSON about the current session. Authentication in dat is currently implemented using HTTP Basic Auth and Cookie based sessions.


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

Where `dXNlcjpwYXNz` is base64 encoded `user + ':' + pass`

## GET /api/login

Same semantics as `/api/session` except the `WWW-Authenticate` header on responses will be set to `Basic realm="Secure Area"` which will make a login form appear in web browsers.

## GET /api/logout

Destroys session on the server and clears session cookie in client.

## GET /api/changes

Returns JSON of the [changes feed](js-api.md#createChangesStream).

### Options

Options should be specified in the query string (e.g. `?foo=bar`)

- `limit` (default `Infinity`) - how many results should be returned
- `since` (default `0`) - which change sequence to start from
- `live` (default `false`) - if `true` http connection will stay alive as a live socket and new changes will be emitted as they happen
- `tail` (default `false`) - if `true` only new data since the query began will be emitted. Only makes sense when used in conjuction with `live`
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

## GET /api/json
## GET /api/bulk
## GET /api/package
## GET /api/manifest
## GET /api/rpc
## GET /api/replicator/receive
## GET /api/replicator/send
