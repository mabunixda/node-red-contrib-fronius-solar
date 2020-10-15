#!/bin/bash

docker run \
    -u root \
    --rm -it \
    --network host \
    -v "$PWD/:/src" \
    nodered/node-red:latest-12-minimal \
    /src/scripts/docker-run.sh
