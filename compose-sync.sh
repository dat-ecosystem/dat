#!/bin/sh

: "${DATADIR:=/data}"


if [ -d "$DATADIR/.dat" ]; then
	echo "using dat to sync data from in $DATADIR"
	dat $OPTS sync $DATADIR
else
	if [[ "$(ls $DATADIR)" == "" ]]; then
		echo "using dat to sync data from $DATAURL into $DATADIR"
		dat $OPTS clone $DATAURL $DATADIR
	else
		echo "$DATADIR not empty, and no .dat dir, so creating new share"
		dat $OPTS create $DATADIR
		dat $OPTS share $DATADIR
	fi
fi
dat sync $DATADIR
