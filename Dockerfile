# The Golang build container.
FROM golang:stretch AS go-build

WORKDIR /usr/src/app
COPY Makefile* *.go go.* ./
COPY x/ x/
COPY cmd/ cmd/
COPY lib/*.go lib/
COPY lib/daemon/ lib/daemon/
COPY lib/helper/ lib/helper/
RUN make compile-go install

# The Node build container
FROM node:stretch AS node-build

WORKDIR /usr/src/app
RUN mkdir lib
COPY lib/*.cc lib/
COPY package*.json *.gyp *.tgz ./
RUN echo 'all:' > Makefile
COPY --from=go-build /usr/src/app/lib/*.so /usr/src/app/lib/*.h ./lib/
RUN npm install && npm run build

# The install container
FROM node:stretch AS install

WORKDIR /usr/src/app
COPY lib/ lib/
COPY --from=go-build /usr/src/app/lib/ lib/
RUN mkdir -p build/Release
COPY ssh-tunnel /ssh-tunnel
COPY package*.json *.tgz ./
COPY demo1/ ./demo1/
COPY bin/ ./bin/
RUN npm install --production
COPY --from=node-build /usr/src/app/build/Release/*.node build/Release/
COPY --from=go-build /go/bin/ag-cosmos-helper /usr/local/bin/

# By default, run the daemon with specified arguments.
EXPOSE 26657
ENTRYPOINT [ "./lib/ag-chain-cosmos" ]
