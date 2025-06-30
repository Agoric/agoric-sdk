DIR=$PWD

CHAIN1_ID="agoriclocal"
CHAIN2_ID="noble-1"
CONFIG_FILE=$HOME/.hermes/config.toml

cd $DIR/test/e2e/agoric-to-axelar-local && npm i 
cd $DIR/test/e2e/agoric-to-axelar-local/packages/axelar-local-dev &&  npm run build
cd $DIR/test/e2e/agoric-to-axelar-local/packages/axelar-local-dev-cosmos &&  npm run build

cd $DIR/test/e2e/agoric-to-axelar-local/packages/axelar-local-dev-cosmos && npm run start && \

cd $DIR && yarn build && scripts/deploy-cli.ts src/chain-info.build.js --net=local --from=gov1 -- net=local peer=axelar:connection-0:channel-0:uaxl && \
cd $DIR && yarn build && scripts/deploy-cli.ts src/portfolio.build.js --net=local --from=gov1  && \
sleep 15 && \
cd $DIR && yarn e2e:relay