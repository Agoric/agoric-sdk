cli-hermes=kubectl exec -it hermes-agoric-osmosis-0 -c relayer -- hermes
exec-agd=kubectl exec -i agoriclocal-genesis-0 -c validator -- agd
exec-osmo=kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd
cli-osmo=kubectl exec -i osmosislocal-genesis-0 -c validator -- /bin/bash -c

AGORIC_TEST_ADDRESS=$(shell $(exec-agd) keys show test1 -a --keyring-backend test)
AGORIC_GENESIS_ADDRESS=$(shell $(exec-agd) keys show genesis -a --keyring-backend test)
OSMOSIS_TEST_ADDRESS=$(shell $(exec-osmo) keys show test1 -a --keyring-backend test)
OSMOSIS_GENESIS_ADDRESS = $(shell $(exec-osmo) keys show genesis -a --keyring-backend test)

TX_FLAGS=--from $(OSMOSIS_GENESIS_ADDRESS) --keyring-backend=test --gas=auto --gas-prices 0.1uosmo --gas-adjustment 1.3 --yes --chain-id osmosislocal
AGD_TX_FLAGS=--from $(AGORIC_GENESIS_ADDRESS) --keyring-backend=test --gas=auto --gas-prices 0.1ubld --gas-adjustment 1.3 --yes --chain-id agoriclocal

CHANNEL_INFO=$(shell $(cli-hermes) --json query channels --show-counterparty --chain agoriclocal \
  | jq '[.][] | select(.result) | .result[] | select(.chain_id_b == "osmosislocal")')
AGORIC_OSMOSIS_CHANNEL=$(shell echo '$(CHANNEL_INFO)' | jq -r '.channel_a')
OSMOSIS_AGORIC_CHANNEL=$(shell echo '$(CHANNEL_INFO)' | jq -r '.channel_b')

REGISTRY_ADDRESS="osmo1wkwy0xh89ksdgj9hr347dyd2dw7zesmtrue6kfzyml4vdtz6e5wsfdyyaj"
SWAPROUTER_ADDRESS="osmo1hrpna9v7vs3stzyd4z3xf00676kf78zpe2u5ksvljswn2vnjp3ysgnqrud"
SWAP_ADDRESS="osmo1ufs3tlq4umljk0qfe8k5ya0x6hpavn897u2cnf9k0en9jr7qarqq7fzxcr"

POOL_ASSET_1_DENOM="uosmo"
POOL_ASSET_1_AMOUNT="250000"
POOL_ASSET_2_DENOM="ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596"

GET_ROUTE_JSON = '{"get_route":{"input_denom":$(POOL_ASSET_2_DENOM),"output_denom":$(POOL_ASSET_1_DENOM)}}'
SET_CHAIN_CHANNEL_LINKS='{"modify_chain_channel_links":{"operations":[{"operation":"set","source_chain":"agoric","destination_chain":"osmosis","channel_id":"$(AGORIC_OSMOSIS_CHANNEL)"},{"operation":"set","source_chain":"osmosis","destination_chain":"agoric","channel_id":"$(OSMOSIS_AGORIC_CHANNEL)"}]}}'
SET_PREFIXES_MSG='{"modify_bech32_prefixes":{"operations":[{"operation":"set","chain_name":"osmosis","prefix":"osmo"},{"operation":"set","chain_name":"agoric","prefix":"agoric"}]}}'
GET_CHANNEL_FROM_CHAINS_MSG='{"get_channel_from_chain_pair":{"source_chain":"osmosis","destination_chain":"agoric"}}'
GET_PREFIX_FROM_CHAIN_MSG='{"get_bech32_prefix_from_chain_name":{"chain_name":"osmosis"}}'

GOOD_SWAP_MEMO='{"wasm":{"contract":$(SWAP_ADDRESS),"msg":{"osmosis_swap":{"output_denom":"uosmo","slippage":{"twap":{"window_seconds":10,"slippage_percentage":"20"}},"receiver":"agoric1elueec97as0uwavlxpmj75u5w7yq9dgphq47zx","on_failed_delivery":"do_nothing", "next_memo":{}}}}}'
BAD_SWAP_MEMO=' \
{"wasm":{ \
	"contract":"$(SWAP_ADDRESS)", \
	"msg":{ \
		"osmosis_swap":{ \
			"output_denom":"uosmo", \
			"slippage":{ \
				"twap":{ \
					"window_seconds":10, \
					"slippage_percentage":"20" \
				} \
			}, \
			"receiver":"$(AGORIC_GENESIS_ADDRESS)", \
			"on_failed_delivery":"do_nothing", \
			"next_memo":{} \
		} \
	} \
}}'

print-wasm-info:
	$(cli-osmo) "cat /contract-info.json"

print-channel-info:
	@echo $(CHANNEL_INFO)

print-agoric-channel:
	@echo $(AGORIC_OSMOSIS_CHANNEL)

print-osmosis-channel:
	@echo $(OSMOSIS_AGORIC_CHANNEL)

print-osmosis-address:
	echo '$(AGORIC_GENESIS_ADDRESS)'

versions:
	$(cli-hermes) --version
	$(exec-agd) version
	$(exec-osmo) version

query-channels:
	$(cli-hermes) query channels --show-counterparty --chain $(CHAIN)

query-balance-osmo:
	$(exec-osmo) query bank balances $(OSMOSIS_TEST_ADDRESS) | jq

query-balance-agoric:
	$(exec-agd) query bank balances agoric1elueec97as0uwavlxpmj75u5w7yq9dgphq47zx | jq

query-route:
	$(exec-osmo) q wasm contract-state smart $(SWAPROUTER_ADDRESS) $(GET_ROUTE_JSON)

query-pool-balance:
	$(exec-osmo) q gamm pool 1 | jq

query-tx-osmo:
	$(exec-osmo) q tx $(TX_HASH) | jq .

query-tx-agoric:
	$(exec-agd) q tx $(TX_HASH) | jq .

query-channel-from-registry:
	$(exec-osmo) q wasm contract-state smart $(REGISTRY_ADDRESS) $(GET_CHANNEL_FROM_CHAINS_MSG) | jq .

query-prefix-from-registry:
	$(exec-osmo) q wasm contract-state smart $(REGISTRY_ADDRESS) $(GET_PREFIX_FROM_CHAIN_MSG) | jq .

tx-chain-channel-links:
	$(exec-osmo) tx wasm execute $(REGISTRY_ADDRESS) $(SET_CHAIN_CHANNEL_LINKS) $(TX_FLAGS)

tx-bec32-prefixes:
	$(exec-osmo) tx wasm execute $(REGISTRY_ADDRESS) $(SET_PREFIXES_MSG) $(TX_FLAGS)

tx-send-xcs-ibc-transfer:
	$(exec-agd) tx ibc-transfer transfer transfer $(AGORIC_OSMOSIS_CHANNEL) $(SWAP_ADDRESS) 125ubld \
	--memo $(GOOD_SWAP_MEMO) $(AGD_TX_FLAGS)