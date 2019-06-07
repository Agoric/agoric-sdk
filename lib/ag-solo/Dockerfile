ARG TAG=latest
FROM agoric/cosmic-swingset:$TAG

WORKDIR /usr/src/app
RUN ln -sf $PWD/bin/ag-solo /usr/local/bin/
COPY . lib/ag-solo/
WORKDIR /usr/src/app/solo

ENTRYPOINT [ "ag-solo" ]
