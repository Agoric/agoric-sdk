The smartWallet release in this proposal is intended to repair a problem. The
problem was that the smartWallet held onto the results of live offers using
ephemeral promises. When the smartWallet vat was upgraded, it would have lost
those promise, and the GUI would never have updated to tell the user when the
offer completed.

In order to verify the effectiveness of the fix, you need
 1) to have an outstanding offer that the smartWallet is monitoring,
 2) upgrade the smartWallet,
 3) cause the order to complete, and finally
 4) validate that the offers status in vstorage has been correctly recorded.

You can repeat this by

```shell
# Run in upgrade-12
./debugTestImaes.ts -m upgrade-12

# ensure you have sufficient IST for the bid
agops vaults open --wantMinted 2 --giveCollateral 5 > OpenVault.offer
agoric wallet send --offer OpenVault.offer --from gov1 --keyring-backend=test

# create a bid on the auction
agops inter bid by-price --price 1 --give 1.0IST --from $GOV1ADDR \
    --keyring-backend test --offer-id perpetual-open-bid-12

# upgrade the wallet factory
cd .../a\:wallet-factory2/
./eval.sh 

# lower the oracle price for ATOM
agops oracle setPrice  --price 0.3  --keyring-backend=test

# check vstore to see that the bids have numWantsSatisfied: 1 and have payouts
# that include positive Collateral and zero Bid. The id of the offer of interest
# is perpetual-open-bid-12 

ADDR=$(agd keys show --address gov1 --keyring-backend=test)
agoric wallet show --from $ADDR 

```
