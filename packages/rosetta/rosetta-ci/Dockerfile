FROM golang:1.19-alpine as build

RUN apk add git tar gcc libc-dev --no-cache

ARG ROSETTA_VERSION="v0.10.1"

# build rosetta CLI
WORKDIR /rosetta
RUN git clone https://github.com/coinbase/rosetta-cli .
RUN git checkout tags/$ROSETTA_VERSION
RUN go build -o rosetta-cli ./main.go

# Start with the solo devnet
FROM agoric/cosmic-swingset-solo:latest
COPY --from=build /rosetta/rosetta-cli /bin/rosetta-cli

WORKDIR /usr/src/agoric-sdk/packages/cosmic-swingset
COPY ./packages/rosetta/configuration configuration

# Change the INITIAL_HEIGHT to 1 for Rosetta
RUN sed -i 's/INITIAL_HEIGHT = 17/INITIAL_HEIGHT = 1/g' Makefile
RUN make scenario2-setup-nobuild

# Install netcat for service checks, and musl because rosetta-cli was built on alpine
RUN apt install -y netcat musl
RUN ln -s /lib/x86_64-linux-musl/libc.so /lib/libc.musl-x86_64.so.1