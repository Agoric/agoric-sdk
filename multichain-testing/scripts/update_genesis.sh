#!/bin/bash

# Set the genesis file path
GENESIS_FILE="$HOME/.elys/config/genesis.json"

# Add the faucet account to genesis
#!/bin/bash
# Set the genesis file path
GENESIS_FILE="$HOME/.elys/config/genesis.json"

FAUCET_ADDRESS="elys1vhdew4wqu3tp8l2d55aqcc73aqvr0rr9ykv6za"
jq --arg addr "$FAUCET_ADDRESS" '.app_state.bank.balances += [{"address": $addr, "coins": [{"denom": "uelys", "amount": "4000000000000"}]}]' \
  $GENESIS_FILE > /tmp/genesis.json.tmp
mv /tmp/genesis.json.tmp $GENESIS_FILE

# Add the faucet account to genesis with a reasonable amount
FAUCET_ADDRESS="elys1ezm7znxcdetyj8sadhzmhgma6sn09wnrtcy3dd"
jq --arg addr "$FAUCET_ADDRESS" '.app_state.bank.balances += [{"address": $addr, "coins": [{"denom": "uelys", "amount": "4000000000000"}]}]' \
  $GENESIS_FILE > /tmp/genesis.json.tmp
mv /tmp/genesis.json.tmp $GENESIS_FILE



# Update price expiry time and lifetime in blocks
jq '.app_state.oracle.params.price_expiry_time = "86400000000"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE
jq '.app_state.oracle.params.life_time_in_blocks = "1000000000"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE

# Add asset profiles
jq '.app_state.assetprofile.entry_list = [
  {
    "address": "",
    "authority": "elys10d07y265gmmuvt4z0w9aw880jnsr700j6z2zm3",
    "baseDenom": "uelys",
    "decimals": "6",
    "denom": "uelys",
    "displayName": "ELYS",
    "displaySymbol": "",
    "externalSymbol": "",
    "ibcChannelId": "",
    "ibcCounterpartyChainId": "",
    "ibcCounterpartyChannelId": "",
    "ibcCounterpartyDenom": "",
    "network": "",
    "path": "",
    "permissions": [],
    "transferLimit": "",
    "unitDenom": ""
  },
  {
    "address": "",
    "authority": "elys10d07y265gmmuvt4z0w9aw880jnsr700j6z2zm3",
    "baseDenom": "uusdc",
    "decimals": "6",
    "denom": "uusdc",
    "displayName": "USDC",
    "displaySymbol": "",
    "externalSymbol": "",
    "ibcChannelId": "",
    "ibcCounterpartyChainId": "",
    "ibcCounterpartyChannelId": "",
    "ibcCounterpartyDenom": "",
    "network": "",
    "path": "",
    "permissions": [],
    "transferLimit": "",
    "unitDenom": ""
  },
  {
    "address": "",
    "authority": "elys10d07y265gmmuvt4z0w9aw880jnsr700j6z2zm3",
    "baseDenom": "ueden",
    "decimals": "6",
    "denom": "ueden",
    "displayName": "EDEN",
    "displaySymbol": "",
    "externalSymbol": "",
    "ibcChannelId": "",
    "ibcCounterpartyChainId": "",
    "ibcCounterpartyChannelId": "",
    "ibcCounterpartyDenom": "",
    "network": "",
    "path": "",
    "permissions": [],
    "transferLimit": "",
    "unitDenom": ""
  },
  {
    "address": "",
    "authority": "elys10d07y265gmmuvt4z0w9aw880jnsr700j6z2zm3",
    "baseDenom": "uedenb",
    "decimals": "6",
    "denom": "uedenb",
    "displayName": "EDENB",
    "displaySymbol": "",
    "externalSymbol": "",
    "ibcChannelId": "",
    "ibcCounterpartyChainId": "",
    "ibcCounterpartyChannelId": "",
    "ibcCounterpartyDenom": "",
    "network": "",
    "path": "",
    "permissions": [],
    "transferLimit": "",
    "unitDenom": ""
  }
]' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE

# Add price feeders
jq '.app_state.oracle.price_feeders = [
  {
    "feeder": "elys1g3qnq7apxv964cqj0hza0pnwsw3q920lcc5lyg",
    "is_active": true
  },
  {
    "feeder": "elys1ufelja7snayw39d0c2hepx0epcuwrmw6z5yg98",
    "is_active": true
  }
]' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE

# Add asset infos
jq '.app_state.oracle.asset_infos = [
  {
    "denom": "satoshi",
    "display": "BTC",
    "band_ticker": "BTC",
    "elys_ticker": "BTC",
    "decimal": "0"
  },
  {
    "denom": "wei",
    "display": "ETH",
    "band_ticker": "ETH",
    "elys_ticker": "ETH",
    "decimal": "0"
  },
  {
    "denom": "uelys",
    "display": "ELYS",
    "band_ticker": "ELYS",
    "elys_ticker": "ELYS",
    "decimal": "6"
  },
  {
    "denom": "ueden",
    "display": "EDEN",
    "band_ticker": "EDEN",
    "elys_ticker": "EDEN",
    "decimal": "6"
  },
  {
    "denom": "uedenb",
    "display": "EDENB",
    "band_ticker": "EDENB",
    "elys_ticker": "EDENB",
    "decimal": "6"
  },
  {
    "denom": "uusdt",
    "display": "USDT",
    "band_ticker": "USDT",
    "elys_ticker": "USDT",
    "decimal": "6"
  },
  {
    "denom": "uusdc",
    "display": "USDC",
    "band_ticker": "USDC",
    "elys_ticker": "USDC",
    "decimal": "6"
  }
]' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE

# Get current timestamp
CURRENT_TIMESTAMP=$(date +%s)

# Add prices
jq --arg timestamp "$CURRENT_TIMESTAMP" '.app_state.oracle.prices = [
  {
    "asset": "USDT",
    "price": "1.0",
    "provider": "elys1ufelja7snayw39d0c2hepx0epcuwrmw6z5yg98",
    "source": "elys",
    "timestamp": $timestamp
  },
  {
    "asset": "USDC",
    "price": "1.0",
    "provider": "elys1ufelja7snayw39d0c2hepx0epcuwrmw6z5yg98",
    "source": "elys",
    "timestamp": $timestamp
  },
  {
    "asset": "ELYS",
    "price": "3",
    "provider": "elys1ufelja7snayw39d0c2hepx0epcuwrmw6z5yg98",
    "source": "elys",
    "timestamp": $timestamp
  },
  {
    "asset": "EDEN",
    "price": "2",
    "provider": "elys1ufelja7snayw39d0c2hepx0epcuwrmw6z5yg98",
    "source": "elys",
    "timestamp": $timestamp
  },
  {
    "asset": "EDENB",
    "price": "2",
    "provider": "elys1ufelja7snayw39d0c2hepx0epcuwrmw6z5yg98",
    "source": "elys",
    "timestamp": $timestamp
  }
]' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE

# Replace "stake" with "uelys"
sed -i 's/"stake"/"uelys"/g' $GENESIS_FILE
jq '.' $GENESIS_FILE > /dev/null || { echo "Genesis file invalid after sed"; exit 1; }
echo "Staking denom updated."

jq '.app_state.gov.params.max_deposit_period = "60s"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE
jq '.app_state.gov.params.voting_period = "60s"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE
jq '.app_state.gov.params.expedited_voting_period = "20s"' $GENESIS_FILE > temp.json && mv temp.json $GENESIS_FILE

jq '.' $GENESIS_FILE > /dev/null || { echo "Genesis file invalid after update_genesis.sh"; exit 1; }
echo "Custom genesis updates applied."
