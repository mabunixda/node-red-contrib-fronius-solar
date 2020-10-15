#!/bin/bash

docker run \
    -u root \
    --rm -it \
    --network host \
    --entrypoint /src/scripts/docker-run.sh \
    -v "$PWD/:/src" \
    nodered/node-red:latest-12-minimal
