#!/bin/bash

## see https://github.com/cosmology-tech/starship/blob/1d60f55c631b4d0f92a43ad92e9a935298aa3aa5/starship/charts/devnet/scripts/default/update-config.sh

CHAIN_ID="${CHAIN_ID:=osmosis}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.osmosisd}"
KEYS_CONFIG="${KEYS_CONFIG:=configs/keys.json}"

set -eux

ls $CHAIN_DIR

echo "Update config.toml file"
sed -i -e 's#"tcp://127.0.0.1:26657"#"tcp://0.0.0.0:26657"#g' $CHAIN_DIR/config/config.toml
sed -i -e 's/index_all_keys = false/index_all_keys = true/g' $CHAIN_DIR/config/config.toml
sed -i -e 's/seeds = ".*"/seeds = ""/g' $CHAIN_DIR/config/config.toml
sed -i -e 's#cors_allowed_origins = \[\]#cors_allowed_origins = \["*"\]#g' $CHAIN_DIR/config/config.toml

echo "Update client.toml file"
sed -i -e 's#keyring-backend = "os"#keyring-backend = "test"#g' $CHAIN_DIR/config/client.toml
sed -i -e 's#output = "text"#output = "json"#g' $CHAIN_DIR/config/client.toml
sed -i -e "s#chain-id = \"\"#chain-id = \"$CHAIN_ID\"#g" $CHAIN_DIR/config/client.toml

echo "Update app.toml file"
sed -i -e "s#minimum-gas-prices = \".*\"#minimum-gas-prices = \"0$DENOM\"#g" $CHAIN_DIR/config/app.toml
sed -i -e "s#pruning = \".*\"#pruning = \"default\"#g" $CHAIN_DIR/config/app.toml
sed -i -e 's#enabled-unsafe-cors = false#enabled-unsafe-cors = true#g' $CHAIN_DIR/config/app.toml
sed -i -e 's#swagger = false#swagger = true#g' $CHAIN_DIR/config/app.toml
sed -i -e 's/enable-unsafe-cors = false/enable-unsafe-cors = true/g' $CHAIN_DIR/config/app.toml
sed -i -e 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' $CHAIN_DIR/config/app.toml

function get_next_line_number() {
  local txt=$1
  local file=$2
  local line_number=$(grep -n "$txt" $file | cut -d: -f1 | head -1)
  echo $((line_number + 1))
}

line_number=$(get_next_line_number "Enable defines if the API server should be enabled." $CHAIN_DIR/config/app.toml)
sed -i -e "${line_number}s/enable = false/enable = true/g" $CHAIN_DIR/config/app.toml

line_number=$(get_next_line_number "Address defines the API server to listen on." $CHAIN_DIR/config/app.toml)
sed -i -e "${line_number}s#address = \".*\"#address = \"tcp://0.0.0.0:1317\"#g" $CHAIN_DIR/config/app.toml

line_number=$(get_next_line_number "Enable defines if the gRPC server should be enabled." $CHAIN_DIR/config/app.toml)
sed -i -e "${line_number}s/enable = false/enable = true/g" $CHAIN_DIR/config/app.toml

line_number=$(get_next_line_number "Address defines the gRPC server address to bind to." $CHAIN_DIR/config/app.toml)
sed -i -e "${line_number}s#address = \".*\"#address = \"0.0.0.0:9090\"#g" $CHAIN_DIR/config/app.toml

if [ "$METRICS" == "true" ]; then
  line_number=$(get_next_line_number "other sinks such as Prometheus." $CHAIN_DIR/config/app.toml)
  sed -i -e "${line_number}s/enabled = false/enabled = true/g" $CHAIN_DIR/config/app.toml

  line_number=$(get_next_line_number "PrometheusRetentionTime, when positive, enables a Prometheus metrics sink." $CHAIN_DIR/config/app.toml)
  sed -i -e "${line_number}s/prometheus-retention-time = 0/prometheus-retention-time = 3600/g" $CHAIN_DIR/config/app.toml
fi

echo "Update consensus params in config.toml"
sed -i -e "s#timeout_propose = \".*\"#timeout_propose = \"$TIMEOUT_PROPOSE\"#g" $CHAIN_DIR/config/config.toml
sed -i -e "s#timeout_propose_delta = \".*\"#timeout_propose_delta = \"$TIMEOUT_PROPOSE_DELTA\"#g" $CHAIN_DIR/config/config.toml
sed -i -e "s#timeout_prevote = \".*\"#timeout_prevote = \"$TIMEOUT_PREVOTE\"#g" $CHAIN_DIR/config/config.toml
sed -i -e "s#timeout_prevote_delta = \".*\"#timeout_prevote_delta = \"$TIMEOUT_PREVOTE_DELTA\"#g" $CHAIN_DIR/config/config.toml
sed -i -e "s#timeout_precommit = \".*\"#timeout_precommit = \"$TIMEOUT_PRECOMMIT\"#g" $CHAIN_DIR/config/config.toml
sed -i -e "s#timeout_precommit_delta = \".*\"#timeout_precommit_delta = \"$TIMEOUT_PRECOMMIT_DELTA\"#g" $CHAIN_DIR/config/config.toml
sed -i -e "s#timeout_commit = \".*\"#timeout_commit = \"$TIMEOUT_COMMIT\"#g" $CHAIN_DIR/config/config.toml

if [ "$METRICS" == "true" ]; then
  sed -i -e "s/prometheus = false/prometheus = true/g" $CHAIN_DIR/config/config.toml
fi
