#!/bin/sh

: "${DATADIR:=/data}"


if [ -d "$DATADIR/.dat" ]; then
	echo "using dat to sync data from in $DATADIR"
	dat sync $DATADIR
else
	echo "using dat to sync data from $DATAURL into $DATADIR"
	dat clone $DATAURL $DATADIR
fi
dat sync $DATADIR
