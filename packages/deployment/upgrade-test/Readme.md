# Dockerized Chain Upgrade Tester

This will build all previous upgrades and upgrade each one.

## Upgrades

| number | description    | notes                                                                      |
| ------ | -------------- | -------------------------------------------------------------------------- |
| 8      | Pismo          | Runs with Pismo release agoric-sdk (including CLI)                         |
| 8.1    | PismoB?        |
| 9      | PismoC ??      |
| 10     | --> Vaults     | Runs with latest SDK. Tests backwards compatibility with Pismo vstorage.   |
| 11     | Vaults --> V+1 | Anticipated upgrade. Tests that Vaults release _can be_ upgraded in place. |

## Testing

**To build the images to latest**

```shell
make build
```

**To run the latest upgrade interactively**

```shell
make run
```

If you get an error about port 26656 already in use, you have a local chain running on your OS.

**To build and run a specific upgrade**

```shell
TARGET=agoric-upgrade-8 make build run
```

To make the wallet ui talk to your local chain, set the network config to
`https://local.agoric.net/network-config`

## Development

You can iterate on a particular upgrade by targeting. When you exit and run again, it will be a fresh state.

By default targets that use "agoric-sdk:latest" will source from CI builds. To use your local checkout of agoric-sdk inside Docker run,

```shell
make local_sdk
```

That will produce the an image tagged agoric-sdk:latest in your local resolution. (Then run `make build run` again.)

You can send information from one run to the next using `/envs`. A release N can append ENV variable setting shell commands to `"$HOME/.agoric/envs"`. The N+1 release will then have them in its environment. (Because `env_setup.sh` starts with `source "$HOME/.agoric/envs"`)

### IDE

Some IDEs support connecting to a running container. For VS Code you can use [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) to connect to a run above. Then you can edit the filesystem using the IDE. Once the workspace opens, you have to add a folder. E.g. `/usr/src/agoric-sdk/packages/agoric-cli/` for tweaking agoric-cli (without a rebuild of SDK).
Note that whatever changes you make within the running container will be lost when you terminate it. Use this just for iterating and be sure to copy any changes you want back to your real workspace.

# TODO
- [ ] a target like `local_sdk` that just copies the local filesystem, without a full rebuild
- [ ] alternately, mount the local agoric-sdk in the container

