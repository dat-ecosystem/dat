#!/usr/bin/env sh
# couldnt figure out undocumented 'output template' mode for pkg so wrote this
# also need to include .node files until pkg supports including them in binary

NODE_ABI="node.napi"
VERSION=$(node -pe "require('./package.json').version")

rm -rf dist

mkdir dist
mkdir builds/dat-$VERSION-linux-x64
mkdir builds/dat-$VERSION-macos-x64
mkdir builds/dat-$VERSION-win-x64

mv builds/dat-linux builds/dat-$VERSION-linux-x64/dat
mv builds/dat-macos builds/dat-$VERSION-macos-x64/dat
mv builds/dat-win.exe builds/dat-$VERSION-win-x64/dat.exe

cp node_modules/utp-native/prebuilds/linux-x64/$NODE_ABI.node builds/dat-$VERSION-linux-x64/
cp node_modules/utp-native/prebuilds/darwin-x64/$NODE_ABI.node builds/dat-$VERSION-macos-x64/
cp node_modules/utp-native/prebuilds/win32-x64/$NODE_ABI.node builds/dat-$VERSION-win-x64/

cp LICENSE builds/dat-$VERSION-linux-x64/
cp LICENSE builds/dat-$VERSION-macos-x64/
cp LICENSE builds/dat-$VERSION-win-x64/

cp README.md builds/dat-$VERSION-linux-x64/README
cp README.md builds/dat-$VERSION-macos-x64/README
cp README.md builds/dat-$VERSION-win-x64/README

cd builds
../node_modules/.bin/cross-zip dat-$VERSION-linux-x64 ../dist/dat-$VERSION-linux-x64.zip
../node_modules/.bin/cross-zip dat-$VERSION-macos-x64 ../dist/dat-$VERSION-macos-x64.zip
../node_modules/.bin/cross-zip dat-$VERSION-win-x64 ../dist/dat-$VERSION-win-x64.zip

rm -rf builds

# now travis will upload the 3 zips in dist to the release
