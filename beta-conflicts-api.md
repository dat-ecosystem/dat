# Conflicts in Dat

Dat uses a **d**irected **a**cyclic **g**raph (AKA ['dag'](https://github.com/jbenet/random-ideas/issues/20), similar to git) to
reason about changes over time. When you `dat pull` from someone, and they
have a different version of a key than you, you store both your version
and their version of that key, but you immediately enter 'conflict mode'.

Conflicts must be handled (or aborted) to complete the pull.

For example, imagine you have a row with key `k` and value `v`. Your
friend clones your dataset. You then both update `k` to different values,
you update yours to `v1` and your friend updates theirs to `v2`.

Now if you pull from your friend you have a conflict because `k` now has
values `v1` and `v2` and Dat doesn't know which version should 'win'.

```
(k,v1) (k,v2)
  \      /
   \    /
    \  /
     \/
     |
     |
   (k,v)
```

Merge this conflict. `k` now has value `v3`

```
  (k,v3)
     |
     /\
    /  \
   /    \ 
  /      \
(k,v1) (k,v2)
  \      /
   \    /
    \  /
     \/
     |
     |
   (k,v)
```

The way you merge is entirely up to you, and Dat will not pick a merge strategy by default because there is no sane default merge strategy for data (unlike source code where you can make relatively safe default assumptions).


# Pulling and merging example

```js
var sync = db.createSyncStream()
var remote = request('someremote.com/sync')

sync.pipe(remote).pipe(sync)

db.on('conflict', function() {
  var conflicts = db.createConflictStream()
  var merger = db.createMergeStream()
  var resolver = createSomeResolver()

  conflicts.pipe(resolver).pipe(merger)
  
  // e.g. if resolver cannot merge then we should abort
  resolver.on('error', function(err) {
    conflicts.destroy()
    merger.destroy()
    db.rollback(db.head, function(err) {
      if (err) return process.exit(1)
    })
  })
}
```
