# Instrument oracle upgrade

Upgrade the existing `ymax1` instance to the locally-built portfolio contract,
then exercise the instrument-oracle invitation and Presley's owner-signed
delegation journey through saved wallet entries and published audit state.
The test verifies each EIP-712 signature off-chain before submitting the
verified signer, matching the EVM Message Service boundary.
