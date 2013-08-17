#!/usr/bin/env Rscript
require(RJSONIO)
finished <- FALSE
f <- file("stdin")
open(f)
while (!finished) {
  line <- readLines(f, 1)
  if (length(line) == 0) {
    finished <- TRUE
  } else {
    obj <- fromJSON(line)
    print(typeof(obj))
    print(obj)
  }
}
