In agoric-sdk, start the chain:

```sh
cd ~/agoric-sdk
git checkout pfm
cd ~/agoric-sdk/packages/cosmic-swingset
make scenario2-setup
# Look for the bootstrap key mnemonic in the command output marked with **Important**
make scenario2-run-chain
# In another terminal, restore that mnemonic (using the below Hermes config):
hermes keys add --mnemonic-file ~/mnemonic.txt --key-name rly1 --chain agoriclocal
# Run the client
make scenario2-run-client
# Use hermes to send transfer with a PFM memo
```