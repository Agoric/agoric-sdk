# Agoric CLI

If you just want to use the Agoric CLI for your own smart contract, please see the [Getting Started website](https://agoric.com/documentation/getting-started/) for information.

## Relaying via IBC

The CLI integrates support for the [Confio
ts-relayer](https://github.com/confio/ts-relayer#quick-start) via the
`agoric ibc-setup` and `agoric ibc-relayer` commands.

Run `agoric start --reset -v local-chain` in a project directory.  In the
meantime, you can configure the relayer (note that `--registry-from .` means to use `./registry.yaml`):

```console
$ agoric ibc-setup init --registry-from . --src local --dest ollinet
...
$ agoric ibc-setup keys list
ollinet: agoric1fwk40de0xu7gtlk8z858q2f5lfcqv33ml8qdg4
local: agoric1rvyry6jqmcrrm4ay9tu23rer7que8kdj4206zk
$
```

Once your chain has booted, send some `uist` tokens to your `local` relayer
account printed above:

```console
$ agd --home=_agstate/keys tx --keyring-backend=test bank send provision agoric1rvyry6jqmcrrm4ay9tu23rer7que8kdj4206zk 20000000uist --from=provision --chain-id=agoriclocal --yes
...
$
```

Go to https://ollinet.faucet.agoric.net and fund your `ollinet` relayer account
printed above with BLD/IBC toy tokens.

Check your relayer balances.  Both `local` and `ollinet` relayer accounts should
show `ubld` and `uist`:

```console
$ agoric ibc-setup balances
CHAIN      AMOUNT
ollinet    74972124ubld
local      20000000uist
$
```

Create an ICS-20 fungible token transfer channel:

```console
$ agoric ibc-setup ics20 -v
...
Created channel:
  agoriclocal: transfer/channel-0 (connection-0)
  agoricollinet-55: transfer/channel-33 (connection-12)
$
```

Now that the channel exists, you can relay packets along it just by using:

```console
$ agoric ibc-relayer start -v --poll 15
```

Leave this running in the background, and use the above `transfer/channel-0` or
`transfer/channel-33` to send tokens back and forth.  The following
example uses the `tx ibc-transfer transfer` command, and then
`transfer channel-0` to indicate the `transfer/channel-0` portID/channelID.  It really wants you to know this is about token *transfer*.

```console
$ agd --home=_agstate/keys tx ibc-transfer transfer --keyring-backend=test \
  transfer channel-0 \
  agoric1fwk40de0xu7gtlk8z858q2f5lfcqv33ml8qdg4 200uist \
  --from=provision --chain-id=agoriclocal --yes
...
# Watch the ibc-relayer send a packet and its acknowledgement, then...
$ agd query bank balances agoric1rvyry6jqmcrrm4ay9tu23rer7que8kdj4206zk
```

## Developing Agoric CLI

**NOTE: these steps are only for modifying the Agoric CLI.  See the above for using it to create your own smart contracts.**

If you want to modify the `template` directory used by Agoric CLI, you can run:

```sh
# Change to the template directory
cd template
# Start the http://localhost:8000 Agoric VM
../bin/agoric --sdk start --reset
# Deploy the test contracts
../bin/agoric --sdk deploy contract/deploy.js api/deploy.js
```

Then, iterate on editing and rerunning the `start` and `deploy` steps above to test the new template.

Please create a PR on this repository if you have an improvement for the template.
