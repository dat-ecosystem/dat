#!/usr/bin/env Rscript

# a simple passthrough stream example in R
# write one json object per line to stdin
# this writes one json object per line to stdout

# change this function to modify each R list object as it gets processed
transform <- function(obj) {
  obj["hello_from"] = "R"
  return(obj)
}

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
    obj <- transform(obj)
    json <- gsub("\n", "", toJSON(obj))
    cat(paste(json, "\n", sep=""))
  }
}

# notes
# using cat() instead of print() keeps the json from getting escaped
# to use: install the RJSONIO R package and have Rscript in your PATH
