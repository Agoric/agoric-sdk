# Upgrade 11

1. upgrade-handler
2. 11wf with walletFactory
3. 11kk with kreadKit

# Testing 11kr

Related: https://github.com/agoric-labs/KREAd/releases/tag/gryo-rc0

It has to be built with these specific addresses, using this one really long command:
```
KREAD_COMMITTEE_ADDRESSES='{"krgov1": "agoric1890064p6j3xhzzdf8daknd6kpvhw766ds8flgw", "krgov2": "agoric1vqm5x5sj4lxmj2kem7x92tuhaum0k2yzyj6mgu"}' \
KREAD_COMMITTEE_NAME=kread-gov \
KREAD_ROYALTY_ADDRESS=agoric1yjc8llu3fugm7tgqye4rd5n92l9x2dhe30dazp \
KREAD_PLATFORM_ADDRESS=agoric1enwuyn2hzyyvt39x87tk9rhlkpqtyv9haj7mgs \
make clean build-proposals
```

Build the images if you haven't lately,
```
make build
```


Then with MN2 set to the repo you build the above from:
```
TARGET=agoric-upgrade-11 MN2=/opt/agoric/KREAd/ make run
```

That will run:
```
docker run --rm -it -p 26656:26656 -p 26657:26657 -p 1317:1317 -v "${PWD}:/workspace" -v "${MN2}:/mn2" -e "DEBUG=SwingSet:ls,SwingSet:vat" -e "DEST=1" -e "TMUX_USE_CC=0" \
        --entrypoint /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh \
         agoric/upgrade-test:agoric-upgrade-11
```

Then in the shell that opens up, replace its `upgrade-test-scripts` with a symlink:
```sh
rm -rf upgrade-test-scripts
ln -s /workspace/upgrade-test-scripts
```

Then use the `/mn2` that `make run` mounted:
```sh
cd /usr/src/agoric-sdk/upgrade-test-scripts

NO_BUILD=true \
MN2_PROPOSAL_INFO=/mn2/agoric/dist/ \
MN2_INSTANCE=kread \
yarn ava /usr/src/agoric-sdk/upgrade-test-scripts/agoric-upgrade-11/mn2-start.test.js
```
