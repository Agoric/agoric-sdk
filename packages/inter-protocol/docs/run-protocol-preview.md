# Start RUN Protocol Preview on Devnet

We propose to launch a preview of the RUN Protocol on Devnet,
comprising the following contracts:

  - stakeMint - borrow RUN against staked BLD
  - AMM - Automated Market Maker
  - VaultFactory - collateralized RUN debt positions
    - liquidateMinimum
  - PSM - Parity Stability Module
    - mintHolder
  - reserve - asset reserve for the RUN protocol

along with supporting governance contracts:
  - contractGovernor
  - binaryVoteCounter
  - committee

This is a `swingset-core-eval` proposal that includes JavaScript to execute to enact the proposal, as well as a JSON policy to limit the capabilities of the proposal.

See also:
 - [using keplr wallet for devnet governance and staking](https://github.com/Agoric/documentation/issues/668)
 - [Install RUN Protocol Preview release in devnet on April 22 · Issue \#5062 · Agoric/agoric\-sdk](https://github.com/Agoric/agoric-sdk/issues/5062)
 - https://agoric.com/discord channel `#devnet`
 - https://commonwealth.im/agoric
