In agoric-sdk, start the chain:

```
yarn build
cd packages/cosmic-swingset
make scenario2-setup-nobuild scenario2-run-chain
```

After producing blocks:

```
ag-cosmos-helper --home=t1/bootstrap --keyring-backend=test tx bank send $(ag-cosmos-helper --home=t1/bootstrap --keyring-backend=test keys show -a bootstrap) agoric189hehmq5mz5zp7mel9u8ellc37pvvr9veyje7a 1000000uagstake --from=bootstrap --chain-id=agoric --yes
make scenario2-run-client
```

Using golang relayer:

```
i=7; rly light init -f agoric && rly light init -f stargate-final && rly paths generate stargate-final agoric transfer$i --port=transfer && rly tx link transfer$i -d -o 3s && rly start transfer$i -d --time-threshold=5m
```

When it says "no packets to relay", go to Agoric REPL:

```
command[0]
E(home.pegasusConnections).entries()
history[0]
[["/ibc-port/transfer/unordered/ics20-1/ibc-channel/channel-0",[Alleged: Connection]{}]]
command[1]
E(home.agoricNames).lookup('instance', 'Pegasus')
history[1]
[Alleged: InstanceHandle]{}
command[2]
E(home.zoe).getPublicFacet(history[1])
history[2]
[Alleged: presence o-61]{}
command[3]
E(history[2]).pegRemote('Muon', history[1][0][1], 'umuon', 'nat', { decimalPlaces: 6 })
history[3]
[Alleged: presence o-158]{}
```

Go to Agoric Wallet Transfer page, look for bech32 for Self.

Transfer muon from stargate-final (the following connection) to agoric-local
(`agoric1...`):
```
rly paths show transfer6 --json | jq '.chains.src."connection-id"'
```
