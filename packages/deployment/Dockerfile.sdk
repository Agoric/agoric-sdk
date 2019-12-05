# The Node install container
FROM agoric/cosmic-swingset:latest

WORKDIR /usr/src/agoric-sdk
COPY . .
RUN (cd packages/cosmic-swingset && tar -cf - .) | (cd ../app && tar -xBpf -) && \
  rm -rf packages/cosmic-swingset && mv ../app packages/cosmic-swingset && \
  ln -s agoric-sdk/packages/cosmic-swingset ../app
RUN echo 'all:' > packages/cosmic-swingset/Makefile

RUN yarn install

RUN yarn build

# By default, run the daemon with specified arguments.
WORKDIR /usr/src/app
EXPOSE 26657
ENTRYPOINT [ "./lib/ag-chain-cosmos" ]
