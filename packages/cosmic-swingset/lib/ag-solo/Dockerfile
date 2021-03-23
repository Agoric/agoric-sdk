ARG TAG=latest
FROM agoric/agoric-sdk:$TAG

WORKDIR /usr/src/app
RUN ln -sf $PWD/bin/ag-solo $PWD/node_modules/.bin/agoric /usr/local/bin/
COPY . lib/ag-solo/
WORKDIR /usr/src/app/solo

EXPOSE 8000
ENTRYPOINT [ "ag-solo", "--webhost=0.0.0.0", "--webport=8000" ]
