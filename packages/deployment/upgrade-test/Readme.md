# Dockerized Chain Upgrade Tester

This will build all previous upgrades and upgrade each one.

## Upgrades

| number | description    | notes                                                                      |
| ------ | -------------- | -------------------------------------------------------------------------- |
| 8      | PismoA         | Runs with Pismo release agoric-sdk (including CLI)                         |
| 8.1    | PismoB         |
| 9      | PismoC         |
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

If you run into other problems, you might have a local `agoric-sdk:latest` that
is stale. Either `make local_sdk` or delete your local image so Docker pulls
from the repository instead.

**To build and run a specific upgrade**

```shell
TARGET=agoric-upgrade-10 make build run
```

This will put you in `/usr/src/agoric-sdk`. You'll run commands from here. `upgrade-test-scripts` is copied here with only the test scripts for the current image.


If you lose the connection and want to get back,
```sh
# find the container id
docker ps
# reattach using the auto-generated goofy name
docker attach sweet_edison
```

**To test CLI**

You can point your local CLI tools to the chain running in Docker. Our Docker config binds on the same port (26656) as running a local chain. So you can use the agoric-cli commands on the Docker chain the same way. But note that the Cosmos account keys will be different from in your dev keyring.

If when reattaching you get a log tail, you need to start a new TTY (with the container name).
```sh
docker exec -it sweet_edison bash
```


**To test GUI**

To make the wallet ui talk to your local chain, set the network config to
`https://local.agoric.net/network-config`

## Development

You can iterate on a particular upgrade by targeting. When you exit and run again, it will be a fresh state.

By default targets that use "agoric-sdk:latest" will source from CI builds. To use your local checkout of agoric-sdk inside Docker run,

```shell
make local_sdk
```
Builds an image: ghcr.io/agoric/agoric-sdk:latest that will be used by all your builds.

That will produce the an image tagged agoric-sdk:latest in your local resolution. (Then run `make build run` again.)

You can send information from one run to the next using `/envs`. A release N can append ENV variable setting shell commands to `"$HOME/.agoric/envs"`. The N+1 release will then have them in its environment. (Because `env_setup.sh` starts with `source "$HOME/.agoric/envs"`)

### IDE

Some IDEs support connecting to a running container. For VS Code you can use [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) to connect to a run above. Then you can edit the filesystem using the IDE. Once the workspace opens, you have to add a folder. E.g. `/usr/src/agoric-sdk/packages/agoric-cli/` for tweaking agoric-cli (without a rebuild of SDK).
Note that whatever changes you make within the running container will be lost when you terminate it. Use this just for iterating and be sure to copy any changes you want back to your real workspace.

# TODO
- [X] make the Docker test environment log verbosely (agd start is just printing "block N" begin, commit)
- [ ] a target like `local_sdk` that just copies the local filesystem, without a full rebuild
- [ ] alternately, mount the local agoric-sdk in the container
- [ ] provide a utility to import the Docker's GOV123 keys into a local keyring

