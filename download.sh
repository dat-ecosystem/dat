#!/bin/bash

# gets latest dat release zip for platform and extracts runnable binary into ~/.dat
# usage: wget -qO- https://raw.githubusercontent.com/datproject/dat/master/bin/install.sh | bash
# based on https://github.com/jpillora/installer/blob/master/scripts/download.sh

DAT_DIR="$HOME/.dat/releases"

function cleanup {
	rm -rf $DAT_DIR/tmp.zip > /dev/null
}

function fail {
	cleanup
	msg=$1
	echo "============"
	echo "Error: $msg" 1>&2
	exit 1
}

function install {
  # bash check
  [ ! "$BASH_VERSION" ] && fail "Please use bash instead"
	GET=""
	if which curl > /dev/null; then
		GET="curl"
		GET="$GET --fail -# -L"
	elif which wget > /dev/null; then
		GET="wget"
		GET="$GET -qO-"
	else
		fail "neither wget/curl are installed"
	fi
  case `uname -s` in
  Darwin) OS="macos";;
  Linux) OS="linux";;
  *) fail "unsupported os: $(uname -s)";;
  esac
  if uname -m | grep 64 > /dev/null; then
  	ARCH="x64"
  else
  	fail "only arch x64 is currently supported for single file install. please use npm instead. your arch is: $(uname -m)"
  fi
  echo "Fetching latest Dat release version from GitHub"
  LATEST=$($GET -qs https://api.github.com/repos/datproject/dat/releases/latest | grep tag_name | head -n 1 | cut -d '"' -f 4);
	mkdir -p $DAT_DIR || fail "Could not create directory $DAT_DIR, try manually downloading zip and extracting instead."
	cd $DAT_DIR
  RELEASE="dat-${LATEST:1}-${OS}-${ARCH}"
  URL="https://github.com/datproject/dat/releases/download/${LATEST}/${RELEASE}.zip"
	which unzip > /dev/null || fail "unzip is not installed"
  echo "Downloading $URL"
	bash -c "$GET $URL" > $DAT_DIR/tmp.zip || fail "download failed"
	unzip -o -qq $DAT_DIR/tmp.zip || fail "unzip failed"
  BIN="$DAT_DIR/$RELEASE/dat"
	chmod +x $BIN || fail "chmod +x failed"
	cleanup
  printf "Dat $LATEST has been downloaded successfully. Execute it with this command:\n\n${BIN}\n\nAdd it to your PATH with this command (add this to .bash_profile/.bashrc):\n\nexport PATH=\"\$PATH:$DAT_DIR/$RELEASE\"\n"
}

install