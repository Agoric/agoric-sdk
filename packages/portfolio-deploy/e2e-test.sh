DIR=$PWD

# Building axelar-local-dev
cd $DIR/test/e2e/agoric-to-axelar-local && npm i 
cd $DIR/test/e2e/agoric-to-axelar-local/packages/axelar-local-dev &&  npm run build
cd $DIR/test/e2e/agoric-to-axelar-local/packages/axelar-local-dev-cosmos &&  npm run build

# Preparing environment for e2e tests
cd $DIR/test/e2e/agoric-to-axelar-local/packages/axelar-local-dev-cosmos && npm run start && \
cd $DIR && yarn build && scripts/deploy-cli.ts src/portfolio.build.js --net=local --from=gov1 -- --keyring-backend test && \
cd $DIR && yarn build && scripts/deploy-cli.ts src/chain-info.build.js --net=local --from=gov1 -- --keyring-backend test -- net=local peer=axelar:connection-0:channel-0:uaxl && \
sleep 15 && \
# Running e2e tests
cd $DIR && yarn e2e:relay