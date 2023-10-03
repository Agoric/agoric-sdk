In agoric-sdk, start the chain:

```sh
yarn build
cd packages/cosmic-swingset
make scenario2-setup-nobuild
# Look for the bootstrap key mnemonic in the command output marked with **Important**
make scenario2-run-chain
# In another terminal, restore that mnemonic (using the below Hermes config):
hermes keys restore agoric -p "m/44'/564'/0'/0/0" -m 'under cake there slam...'
# Run the client
make scenario2-run-client
```

Hermes config looks like:

```toml
[global]
strategy = 'all'
filter = false
log_level = 'trace'
clear_packets_interval = 100

[telemetry]
enabled = false
host = '127.0.0.1'
port = 3001

[[chains]]
id = 'agoric'
rpc_addr = 'http://127.0.0.1:26657'
grpc_addr = 'http://127.0.0.1:9090'
websocket_addr = 'ws://127.0.0.1:26657/websocket'
rpc_timeout = '10s'
account_prefix = 'agoric'
key_name = 'localkey'
store_prefix = 'ibc'
max_gas = 3000000
gas_price = { price = 0.001, denom = 'uist' }
gas_adjustment = 0.1
clock_drift = '5s'
trusting_period = '14days'

[chains.trust_threshold]
numerator = '1'
denominator = '3'

[[chains]]
id = 'cosmoshub-testnet'
rpc_addr = 'https://rpc.testnet.cosmos.network:443'
grpc_addr = 'https://grpc.testnet.cosmos.network:443'
websocket_addr = 'wss://rpc.testnet.cosmos.network:443/websocket'
rpc_timeout = '10s'
account_prefix = 'cosmos'
key_name = 'hubkey'
store_prefix = 'ibc'
max_gas = 3000000
gas_price = { price = 0.001, denom = 'uphoton' }
gas_adjustment = 0.1
clock_drift = '5s'
trusting_period = '14days'

[chains.trust_threshold]
numerator = '1'
denominator = '3'
```

Running the relayer is:

```
hermes create channel cosmoshub-testnet agoric --port-a transfer --port-b transfer -o unordered
# [...many lines, then]
# Success: Channel {
#    ordering: Unordered,
#    a_side: ChannelSide {
#        chain: ProdChainHandle {
#            chain_id: ChainId {
#                id: "cosmoshub-testnet",
#                version: 0,
#            },
#            runtime_sender: Sender { .. },
#        },
#        client_id: ClientId(
#            "07-tendermint-75",
#        ),
#        connection_id: ConnectionId(
#            "connection-74",
#        ),
#        port_id: PortId(
#            "transfer",
#        ),
#        channel_id: Some(
#            ChannelId(
#                "channel-69",
#            ),
#        ),
#    },
#    b_side: ChannelSide {
#        chain: ProdChainHandle {
#            chain_id: ChainId {
#                id: "agoric",
#                version: 0,
#            },
#            runtime_sender: Sender { .. },
#        },
#        client_id: ClientId(
#            "07-tendermint-0",
#        ),
#        connection_id: ConnectionId(
#           "connection-0",
#        ),
#        port_id: PortId(
#            "transfer",
#        ),
#        channel_id: Some(
#            ChannelId(
#                "channel-2",
#            ),
#        ),
#    },
#    connection_delay: 0ns,
#    version: Some(
#        "ics20-1",
#    ),
# }
hermes start
```

Using golang relayer:

```sh
i=7; rly light init -f agoric && rly light init -f stargate-final && rly paths generate stargate-final agoric transfer$i --port=transfer && rly tx link transfer$i -d -o 3s && rly start transfer$i -d --time-threshold=5m
```

When Golang relayer says "no packets to relay", or when Hermes started, go to Agoric REPL:

```
command[0]
E(home.pegasusConnections).entries()
history[0]
[["/ibc-port/transfer/unordered/ics20-1/ibc-channel/channel-0",{"actions":[Object Alleged: pegasusConnectionActions]{},"localAddr":"/ibc-port/transfer/unordered/ics20-1/ibc-channel/channel-0","remoteAddr":"/ibc-hop/connection-0/ibc-port/transfer/unordered/ics20-1/ibc-channel/channel-270","remoteDenomSubscription":[Object Alleged: Subscription]{}}]]
command[1]
E(history[0][0][1].actions).pegRemote('Muon', 'umuon', 'nat', { decimalPlaces: 6 })
history[1]
[Object Alleged: Muon peg]{}
command[2]
E(home.agoricNames).lookup('instance', 'Pegasus')
history[2]
[Object Alleged: InstanceHandle]{}
command[3]
E(home.zoe).getPublicFacet(history[2])
history[3]
[Object Alleged: pegasus]{}
command[4]
E(history[1]).getLocalBrand()
history[4]
[Object Alleged: Local1 brand]{}
command[5]
E(history[3]).getLocalIssuer(history[4])
history[5]
[Object Alleged: Local1 issuer]{}
command[6]
E(home.board).getId(history[5])
```

Go to Agoric Wallet Setup page, import muon issuer from above board ID.

Go to Agoric Wallet Transfer page, look for bech32 for Self.

Transfer muon from stargate-final (the following connection) to agoric-local
(`agoric1...`):
```
rly paths show transfer7 --json | jq '.chains.src."channel-id"'
```
