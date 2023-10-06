# Upgrade 11

1. upgrade-handler
2. 11wf with walletFactory
3. 11kr with kreadKit

# Testing 11kr

Related: https://github.com/agoric-labs/KREAd/releases/tag/gryo-rc0

It has to be built with these specific addresses, using this one really long command:
```sh
KREAD_COMMITTEE_ADDRESSES='{"krgov1": "agoric1890064p6j3xhzzdf8daknd6kpvhw766ds8flgw", "krgov2": "agoric1vqm5x5sj4lxmj2kem7x92tuhaum0k2yzyj6mgu"}' \
KREAD_COMMITTEE_NAME=kread-gov \
KREAD_ROYALTY_ADDRESS=agoric1yjc8llu3fugm7tgqye4rd5n92l9x2dhe30dazp \
KREAD_PLATFORM_ADDRESS=agoric1enwuyn2hzyyvt39x87tk9rhlkpqtyv9haj7mgs \
make clean build-proposals
```

Build the images if you haven't lately,
```sh
make build
```


Then with MN2 set to the repo you build the above from:
```sh
TARGET=agoric-upgrade-11 MN2=/opt/agoric/KREAd/ make run
```

That will run:
```sh
docker run --rm -it -p 26656:26656 -p 26657:26657 -p 1317:1317 -v "${PWD}:/workspace" -v "${MN2}:/mn2" -e "DEBUG=SwingSet:ls,SwingSet:vat" -e "DEST=1" -e "TMUX_USE_CC=0" \
        --entrypoint /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh \
         agoric/upgrade-test:agoric-upgrade-11
```

Then in a new shell do the following.
(TODO integrate these into the layers)
```sh
# Replace its `upgrade-test-scripts` with a symlink:
rm -rf upgrade-test-scripts
ln -s /workspace/upgrade-test-scripts

# Patch agoric-cli
cp upgrade-test-scripts/agoric-upgrade-11/gov-cmd packages/agoric-cli/src/commands/gov.js
cp upgrade-test-scripts/agoric-upgrade-11/agops-bin packages/agoric-cli/src/bin-agops.js
## this should be docker-u11
agops --version

# patch agd so it doesn't try to rebuild
#sed --in-place=.backup '93,$ d' /usr/src/agoric-sdk/bin/agd
#- find `$BUILD_ONLY || exec 1>&2` (line 94?)
#- put this in above it: `${NO_BUILD:-false} && exit 0`
vi /usr/src/agoric-sdk/bin/agd


# Run the test using the `/mn2` that `make run` mounted:
cd /usr/src/agoric-sdk/upgrade-test-scripts

NO_BUILD=true \
MN2_PROPOSAL_INFO=/mn2/agoric/dist/ \
MN2_INSTANCE=kread \
yarn ava /usr/src/agoric-sdk/upgrade-test-scripts/agoric-upgrade-11/mn2-start.test.js
```

Test governance
TODO put into JS
```sh
# should have two invitations in balances
agoric wallet show --keyring-backend=test --from krgov1

agops gov committee --name kreadCommittee --send-from krgov1
agops gov charter --name kreadCommitteeCharter --send-from krgov1

# now should have two used invitations
agoric wallet show --keyring-backend=test --from krgov1

# propose to pause offers
agops gov proposePauseOffers --instance kread --send-from krgov1 --substring foo

# verify it's there
agd query vstorage data published.committees.kread-gov.latestQuestion

agops gov vote --instance kreadCommittee --pathname kread-gov --forPosition 0 --send-from krgov1

# after a minute the chain output should report the question resolving in the affirmative
agd query vstorage data published.committees.kread-gov.latestOutcome
# TODO a way to read capdata out of vstorage
# this should say "win" for the strings you specified
agd query vstorage data --output json published.committees.kread-gov.latestOutcome | jq -r .value | jq -r .values[0] | jq
```
