ARG TAG=latest
FROM agoric/agoric-sdk:$TAG

WORKDIR /data/solo

EXPOSE 8000
ENTRYPOINT [ "ag-solo", "--webhost=0.0.0.0", "--webport=8000" ]
