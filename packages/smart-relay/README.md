# How to run

```sh
yarn install
make init
make run
# When quiesced, in another terminal:
make relay
# Then run any of the other make targets:
make help
```

To add in the feature where the smart-relayer can talk to a contract on chain
`ibc0`, instead of `make relay`, do:

```sh
make register-ibc0-with-relay
make relay
```

## Installing a new relay policy

Relay policies are defined in regular `.js` files (see `halfdrop-handler.js`
or `delay-handler.js` for examples). For now, these must be a single file,
which defines a single function (there must be no `import` or `require()`
calls, and no other top-level JS constructs: the first non-comment line must
be the `function` definition). Eventually these will be bundled in a way that
enables modularization, but that hasn't happened yet.

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

If the relayer has connected to a "control chain", two additional endowments
will be useful:

* `zoe`: a Promise for a reference to the Zoe instance on that chain
* `commander`: a Promise for a reference to the Registry's object, as named
  by the key you provided to `install-policy`
