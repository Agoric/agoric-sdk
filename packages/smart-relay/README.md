# How to run

You'll first need to set up the required programs:

```sh
yarn install
(cd ../cosmic-swingset && make all install)
make init
make run
# Then run any of the other make targets:
make help
```

## Two chains and a relayer

The above sequence creates two Agoric chains (`ibc0` and `ibc1`) that are
connected via IBC, and a relayer that can connect between them.

### Echo port

To start a new IBC echo channel (one that just acknowledges what it receives)
from `ibc0` to `ibc1`, go to http://localhost:8000 and run the following:

```js
c = home.ibcport[0]~.connect('/ibc-hop/ibconelink/ibc-port/echo/ordered/echovsn', home.agent.text('echo'))
```

This will print out instructions, like:

```
echo says: # Set up the relayer for this path:
ag-nchainz start-relayer <<'EOF'
{
 "src": {
   "connection-id": "ibconelink",
   "channel-id": "channeltoivkps",
   "port-id": "portbvmnfb",
   "order": "ORDERED",
   "version": "echovsn"
 },
 "dst": {
   "channel-id": "channeltocdeyhb",
   "port-id": "echo",
   "order": "ORDERED"
 }
}
EOF
# then your connection will try to proceed.
```

To begin the relayer, start typing `make`, then copy all the text from
`start-relayer` to `EOF`, like:

```sh
make start-relayer <<'EOF'
{
 "src": {
   "connection-id": "ibconelink",
   "channel-id": "channeltoivkps",
   "port-id": "portbvmnfb",
   "order": "ORDERED",
   "version": "echovsn"
 },
 "dst": {
   "channel-id": "channeltocdeyhb",
   "port-id": "echo",
   "order": "ORDERED"
 }
}
EOF
```

You should see relay messages exchanged on the console, and eventually, your
Promise will settle (become a Presence) in the web browser:

```
history[5] [Presence o-70]{}
```

Then you can send a message to the echo server:

```
c~.send('Hello, world!')
```

You will see more relay messages exchanged on the console, and the resulting
Promise will settle to the data you sent, `"Hello, world!"`.

### Transfer port

If you wish to connect to the `transfer` port on ibc1, paste the following into the web page:

```
c = home.ibcport[1]~.connect('/ibc-hop/ibconelink/ibc-port/transfer/ordered/ics20-1',
{ onReceive(c, p) { console.log('received', p); return `{"success":true}`; }, onOpen(c, la, ra) { console.log('opened', la,
ra) }, infoMessage(...args) { console.log('transfer connection:',
...args) }})
```

Again, paste the resulting instructions to a console command beginning with
`make` (instead of ag-nchainz). Take note of the link name that has been chosen
for this link (something like `zero`, `one`, `two`, etc). That is `<YOUR-LINK>`
below.

On another console, send a relay transfer message that will be forwarded from
`ibc1` to `ibc0`:

```sh
./bin/rly tx raw xfer-send ibc1 ibc0 10n0token true $(./bin/rly keys show ibc0 -a` -p <YOUR-LINK>)
```

You can see the results of this transfer displayed in the web page.

## Installing a new relay policy

Relay policies are defined in regular `.js` files (see `halfdrop-handler.js` or
`delay-handler.js` for examples). For now, these must be a single file, which
defines a single function (there must be no `import` or `require()` calls, and
no other top-level JS constructs: the first non-comment line must be the
`function` definition). Eventually these will be bundled in a way that enables
modularization, but that hasn't happened yet.

Suppose your new policy file is named `my-policy.js`. You can then install it
with `./install-policy my-policy.js`. If you want to get fancy, and your
relayer is connected to a control chain, you can name a "commander" object by
its Registry key on that chain. These keys are strings shaped like
`name_1234`, and are generated when you install and instantiate a contract on
the chain. If you run `./install-policy my-policy.js name_1234`, the Registry
will be consulted, and the object with that key will be passed into the
policy as it's "commander".

The function in your policy file should be named `makePolicy`. It will get a
single argument that defines a set of `endowments`. They are:

* `E`: you'll need this to send messages: `E(target).methodname(args)`
* `harden`: message arguments must be hardened first
* `console`: for `console.log`

## Control chain

To add in the feature where the smart-relayer can talk to a contract on chain
`ibc0`, do the following step before starting the relayer:

```sh
make register-ibc0-with-relay
```

After connecting to the "control chain", two additional endowments
will be useful to policies you install:

* `zoe`: a Promise for a reference to the Zoe instance on that chain
* `commander`: a Promise for a reference to the Registry's object, as named
  by the key you provided to `install-policy`
