agd tx bank send bootstrap agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 25000000uist,25000000ibc/toyusdc --broadcast-mode=sync --chain-id=agoriclocal --keyring-backend=test --keyring-dir=~/Projects/agoric-sdk/packages/cosmic-swingset/t1/bootstrap --node=http://localhost:26657 --output=json --yes
sleep 10
agd tx swingset provision-one faucet_provision agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 SMART_WALLET --broadcast-mode=block --chain-id=agoriclocal --from=bootstrap --keyring-backend=test --keyring-dir=$'~/Projects/agoric-sdk/packages/cosmic-swingset/t1/bootstrap' --node=http://localhost:26657 --yes
sleep 5
agd tx swingset provision-one faucet_provision agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce SMART_WALLET --broadcast-mode=block --chain-id=agoriclocal --from=bootstrap --keyring-backend=test --keyring-dir=$'~/Projects/agoric-sdk/packages/cosmic-swingset/t1/bootstrap' --node=http://localhost:26657 --yes
sleep 5
agd tx swingset provision-one faucet_provision agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang SMART_WALLET --broadcast-mode=block --chain-id=agoriclocal --from=bootstrap --keyring-backend=test --keyring-dir=$'~/Projects/agoric-sdk/packages/cosmic-swingset/t1/bootstrap' --node=http://localhost:26657 --yes
sleep 5
agd tx swingset provision-one faucet_provision agoric1rwwley550k9mmk6uq6mm6z4udrg8kyuyvfszjk SMART_WALLET --broadcast-mode=block --chain-id=agoriclocal --from=bootstrap --keyring-backend=test --keyring-dir=$'~/Projects/agoric-sdk/packages/cosmic-swingset/t1/bootstrap' --node=http://localhost:26657 --yes
sleep 5
agd tx bank send bootstrap agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang '75000000ubld' --broadcast-mode=sync --chain-id=agoriclocal --keyring-backend=test --keyring-dir='~/Projects/agoric-sdk/packages/cosmic-swingset/t1/bootstrap' --node=http://localhost:26657 --output=json --yes
