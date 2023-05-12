# Dockerized Chain Upgrade Tester

This will build all previous upgrades and upgrade each one


if you desire to use your local sdk build instead of the latest-available published master, you can do the following:

`make local_sdk`


To build the images to latest run

`make build`

To run the latest upgrade interactively run

`make run`




To build and run a specific upgrade

```shell
TARGET=agoric-upgrade-8 make build run
```



To make the wallet ui talk to your local chain, set the network config to
`https://local.agoric.net/network-config`
