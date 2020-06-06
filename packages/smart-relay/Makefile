# The relayer path to use.
path = zero

init:
	rm -rf state
	mkdir state
	./bin/nchainz init norun ibc0=agoric ibc1=agoric
	@echo "Next run \`make run' and \`make relay' in separate terminals"

run:
	./bin/nchainz run

start-relayer:
	PATH="./bin:$$PATH"; ag-nchainz start-relayer

# there are five cosmos-like nodes involved:
# 1: chain ibc0 (which contains a swingset module)
#    state lives in: nchainz/data/ibc0/n0/ag-chain-cosmos
# 2: an ag-solo that talks to ibc0
#    state lives in nchainz/data/ibc0/ag-solo-8000
#     VatTP connections use key material in nchainz/data/ibc0/n0/ag-cosmos-helper
# 3: chain ibc1 (nchainz/data/ibc1/n0/ag-chain-cosmos)
# 4: an ag-solo for ibc0 (nchainz/data/ibc1/ag-solo-8000)
#     VatTP connections use key material in nchainz/data/ibc1/n0/ag-cosmos-helper
# 5: the smart-relay solo node (with embedded swingset)
#     state/rly/keys/ibc[01] is used to send txns to chain ibc[01]
#     state/rly/lite/ibc[01] contains light-client state
#     state/relay-swingset contains the swingset state

# The key in nchainz/data/ibc0/n0/ag-cosmos-helper is the ibc0 "bootstrap"
# key: it has a bunch of tokens, and can provision new clients. To use it,
# we'll run ag-cosmos-helper with --home= and a bunch of other options.

# Once the chains are running, we want to establish a VatTP connection
# between the ibc0 chain and the smart-relayer solo node. When the
# smart-relayer wants to send VatTP txns into ibc0, it will use the same key
# that the relayer library uses to send IBC txns. We must extract the address
# of this key, and provision it to get a VatTP egress object set up.

GET_RLY_IBC0_ADDR = ag-cosmos-helper --home=state/rly/keys/ibc0 --keyring-backend=test keys list -o json | jq -r .[0].address
t-addr:
	$(GET_RLY_IBC0_ADDR)

# note: we don't need to do this: the relayer setup has already provisioned our relayer's key.
OFF-register-relay-with-ibc0:
	ag-cosmos-helper tx swingset provision-one smart-relay `$(GET_RLY_IBC0_ADDR)` --home=nchainz/data/ibc0/n0/ag-cosmos-helper --keyring-backend=test --from=n0 --yes

# Now we need to tell the smart-relay swingset VatTP layer about the ibc0
# chain. For this, we need the chain's GCI, which is a hash of its genesis
# block.
GET_IBC0_GCI = ../cosmic-swingset/calc-gci.js ./nchainz/data/ibc0/n0/ag-chain-cosmos/config/genesis.json
t-gci:
	$(GET_IBC0_GCI)
# We also need the ibc0 node's RPC port
GET_IBC0_RPC = ../cosmic-swingset/calc-rpcport.js ./nchainz/data/ibc0/n0/ag-chain-cosmos/config/config.toml
t-rpc:
	$(GET_IBC0_RPC)
# And also the chain ID, which we hardcode to 'ibc0' (but could read with jq
# -r .chain_id nchainz/data/ibc0/n0/ag-chain-cosmos/config/genesis.json).
IBC0_CHAINID = ibc0

# We must write all this data into state/connections.json before the
# relayer's swingset starts
register-ibc0-with-relay:
	./build-connections.js state/rly/keys/ibc0 `$(GET_RLY_IBC0_ADDR)` `$(GET_IBC0_GCI)` `$(GET_IBC0_RPC)` $(IBC0_CHAINID) testkey
	jq < state/connections.json

relay:
	@PATH="./bin:$$PATH" rly tx link-then-start -d $(path) --timeout=3s

poke-http:
	curl http://localhost:8008/hello
	@echo

poke-bridge-handshake:
	curl http://localhost:8008/sendIntoBridge/is-handshake
	@echo
poke-bridge-packet:
	curl http://localhost:8008/sendIntoBridge/is-packet
	@echo
poke-bridge-ack:
	curl http://localhost:8008/sendIntoBridge/is-ack
	@echo
poke-bridge-unknown:
	curl http://localhost:8008/sendIntoBridge/unknown
	@echo

help:
	@echo 'poke-http                 say hello'
	@echo	'poke-bridge-handshake     send a handshake'
	@echo 'poke-bridge-packet        send a packet'
	@echo 'poke-bridge-ack           send an ack'
	@echo 'poke-bridge-unknown       send an unknown'
	@echo 'install-halfdrop-handler  install a handler that drops half'
	@echo 'install-delay-handler     install a handler that delays'

install-halfdrop-handler:
	./install-policy ./halfdrop-handler.js

install-delay-handler:
	./install-policy ./delay-handler.js
