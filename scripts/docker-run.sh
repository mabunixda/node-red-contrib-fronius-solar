#!/bin/sh

npm link /src


cd /src || exit 1
npm install
npm install  npm-check
npm install  mocha
npm install  eslint

cd /usr/src/node-red || exit 2

/bin/sh
