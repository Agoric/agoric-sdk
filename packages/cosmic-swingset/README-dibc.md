# Using Dynamic IBC (dIBC)

Run `make` in the current (cosmic-swingset) directory to build the Agoric Cosmos
chain integration.

You will need the Golang Cosmos IBC relayer source code.  You can clone it from
https://github.com/cosmos/relayer  Don't worry about building it, that will
happen later.

```sh
cd relayer
# Initialize two Agoric chains, and say "y" when prompted to run the `connect` and
# `run` steps.
./scripts/nchainz init agoric
```

Let this run in the background until it says that the connection has been established.
It will print out something like:

```
===============================
=== All connections initialized
I[2021-02-15|09:53:02.283] ★ Connection created: [ibc0]client{07-tendermint-0}conn{connection-0} -> [ibc1]client{07-tendermint-0}conn{connection-0} 
===============================
```

The `ibc0` ag-solo client can be found by running `agoric open --repl`.  If you
need an `ibc1` client, then you can open it with `agoric open
--hostport=localhost:8001 --repl`.

## Echo Channel

On the `ibc0` client, send the following request to the REPL to create a channel
over `connection-0` to the other chain's (`ibc1`) echo server.

```js
c = home.ibcport[0]~.connect('/ibc-hop/connection-0/ibc-port/echo/ordered/echovsn', { infoMessage(...args) { console.log(...args) } })
```

The above command will print out instructions in the REPL about how to establish
the connection.  After following them, and when the relayer has started running,
you will see the above REPL command resolve to a presence.

Then:
```js
c~.send(`Hello, world!`)
```

Watch the relayer that you started by following the "connect" instructions
above.  You'll see it forwards a single packet and acknowledgement.  There may
be errors, but that's par for the course with the current relayer.  All that
matters is that after the acknowledgement is relayed, you'll see the above REPL
command resolve to:

```js
"Hello, world!"
```

## Fungible Token Transfer Channel

To test interoperability between the IBC transfer application and dIBC, run the
following in the `ibc0` REPL:

```js
c = home.ibcport[0]~.connect('/ibc-hop/connection-0/ibc-port/transfer/unordered/ics20-1', { infoMessage(...args) { console.log(...args) }, onReceive(c, p) { console.log('received', p) }, onOpen(c) { console.log('opened') } })
```

Again, follow the instructions printed to the REPL.

Then run the IBC transfer request, where `path-2` is the path that was printed
in the newly-started relayer:

```sh
rly tx xfer ibc1 ibc0 10000n0token $(rly keys show ibc0 testkey) -ppath-2
```

You should see an inbound message in your REPL like:

```js
{ "type": "ibc/transfer/PacketDataTransfer", "value": transfer_message }
```
