# Dockerized Chain Upgrade Tester

This will build an image upgrade of [agoric-3-proposals](https://github.com/Agoric/agoric-3-proposals), a Docker based environment simulating the agoric-3 mainnet chain, using the latest agoric-sdk.

## Testing

**To build the upgrade image**

```shell
make build
```

By default pre-releases use the lastest image tagged `dev` in our [container repository](https://github.com/agoric/agoric-sdk/pkgs/container/agoric-sdk). To use
a specific build:

```shell
DEST_IMAGE=ghcr.io/agoric/agoric-sdk:20230515033839-e56ae7
```
To use a build based on local changes:
```shell
# build ghcr.io/agoric/agoric-sdk:latest
make local_sdk build
# or DEST_IMAGE=ghcr.io/agoric/agoric-sdk:latest make build
```

**To run the upgrade interactively**

```shell
make run
```

This will start a container with the output of chain start.

To get a shell: `make shell`

  For more info: https://phase2.github.io/devtools/common-tasks/ssh-into-a-container/

The container and chain will halt once you detach from the session.

### Troubleshooting
If you get an error about port 26656 already in use, you have a local chain running on your OS.

If you run into other problems, you might have a local `agoric-sdk:latest` that
is stale. Either `make local_sdk` or delete your local image so Docker pulls
from the repository instead.

If you lose the connection and want to get back,
```sh
# find the container id
docker ps
# reattach using the auto-generated goofy name
docker attach sweet_edison
```

**To pass specific `software-upgrade --upgrade-info`**

```shell
json='{"some":"json","here":123}'
make build BUILD_OPTS="--build-arg UPGRADE_INFO='$json'"
```

Search this directory for `UPGRADE_INFO` if you want to see how it is plumbed
through.

**To test CLI**

You can point your local CLI tools to the chain running in Docker. Our Docker config binds on the same port (26656) as running a local chain. So you can use the agoric-cli commands on the Docker chain the same way. But note that the Cosmos account keys will be different from in your dev keyring.

If when reattaching you get a log tail, you need to start a new TTY (with the container name).
```sh
docker exec -it sweet_edison bash
```

or just use this helper,
```
make shell
```


**To test GUI**

To make the wallet ui talk to your local chain, set the network config to
`https://local.agoric.net/network-config`

## Development

When you exit and run again, the container will be a fresh state.

By default targets that use "agoric-sdk:latest" will source from CI builds. To use your local checkout of agoric-sdk inside Docker run,

```shell
make local_sdk
```
Builds an image: ghcr.io/agoric/agoric-sdk:latest that will be used by all your builds.

That will produce an image tagged agoric-sdk:latest in your local resolution. (Then run `make build run` again.)

For more details about the docker upgrade test framework, refer to the [agoric-3-proposals](https://github.com/Agoric/agoric-3-proposals) repository.

### IDE

Some IDEs support connecting to a running container. For VS Code you can use [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) to connect to a run above. Then you can edit the filesystem using the IDE. Once the workspace opens, you have to add a folder. E.g. `/usr/src/agoric-sdk/packages/agoric-cli/` for tweaking agoric-cli (without a rebuild of SDK).
Note that whatever changes you make within the running container will be lost when you terminate it. Use this just for iterating and be sure to copy any changes you want back to your real workspace.

# TODO
- [X] make the Docker test environment log verbosely (agd start is just printing "block N" begin, commit)
- [ ] a target like `local_sdk` that just copies the local filesystem, without a full rebuild
- [ ] alternately, mount the local agoric-sdk in the container
- [ ] provide a utility to import the Docker's GOV123 keys into a local keyring

