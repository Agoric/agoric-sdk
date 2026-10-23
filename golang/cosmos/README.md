# Agoric Cosmos daemon

## Selecting the Agoric VM

`agd` uses an embedded Agoric VM by default. It delegates to the JavaScript VM
entrypoint, which loads the native Cosmos binding and runs Go and JavaScript in
the same process. Set the boolean `--split-vm` flag to keep `agd` running in its
own process and launch the JavaScript VM as a child connected by pipes.

The independent `--vm-path` option selects the VM executable in either mode:

| Options | Process mode | VM executable |
| --- | --- | --- |
| No VM options | Embedded | Automatic discovery |
| `--split-vm` or `--split-vm=true` | Separate processes | Automatic discovery |
| `--split-vm=false` | Embedded | Automatic discovery |
| `--vm-path=/path/to/vm` | Embedded | Specified executable |
| `--split-vm --vm-path=/path/to/vm` | Separate processes | Specified executable |
| `--vm-path=` | Determined by `--split-vm` | Automatic discovery |

An explicit path may be absolute or relative to the working directory. A program
name without a directory is resolved using `PATH`. Names such as `embedded` and
`default` are ordinary executable names; they have no special meaning.

Automatic discovery looks for `ag-chain-cosmos` next to `agd`, then for the
`cosmic-swingset/src/entrypoint.js` locations used by the package/repository
layout, and finally for `ag-chain-cosmos` on `PATH`. Both explicitly selected and
discovered programs must be executable; a missing program, directory, or file
without execute permission fails before delegation or spawning.

For example:

```sh
agd start
agd start --split-vm
agd start --split-vm=false --vm-path=./custom-vm
agd start --split-vm --vm-path=./custom-vm
```

The options are available on `start`, `export`, `snapshots export`,
`snapshots restore`, `comet bootstrap-state`, and `rollback`.
`cometbft` and `tendermint` are aliases of `comet`. A VM is launched when the
command needs the application; for example, bootstrap-state with an explicit
height can avoid loading it. Export with swing-store export mode `skip` does not
launch a VM.

The old `--split-vm=PATH`, `--split-vm=embedded`, and `--split-vm=default` forms
are no longer supported. Use the boolean flag and `--vm-path` instead.

## Export delegation

For an embedded export that needs swing-store data, the first `agd` invocation
delegates to the VM entrypoint. That entrypoint installs the native controller
and reenters the command. The first invocation must not create `genesis.json`:
the invocation with the controller creates it exclusively, so an existing
genesis file cannot be overwritten. Split-process exports create the file in
`agd` and communicate with the VM child. Selecting an embedded VM is distinct
from having an embedded controller already installed.
