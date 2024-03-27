agd tx bank send validator $GOV1ADDR 20123000000ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA --keyring-backend=test --chain-id=agoriclocal --yes -bblock
agops vaults open --giveCollateral 5000 --wantMinted 20000 > /tmp/offer.json
agops perf satisfaction --executeOffer /tmp/offer.json --from gov1 --keyring-backend=test


# ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA