# Lazy Noble provisioning upgrade

Upgrade the released `ymax1` instance to the locally built portfolio contract,
then open a portfolio through the EVM wallet handler. The test verifies that
the ETH-wallet open completes without creating a Noble ICA or beginning Noble
Forwarding Account registration. A later Noble-dependent plan must begin that
provisioning on demand.

`presley-plan-observations.test.js` shares this upgrade to exercise Presley's
owner-signed delegation journey through saved wallet entries and published audit
state. The real planner capability resolves one delegated flow with acceptable
observations for two instruments and rejects another after Presley tightens the
single global mandate. Owner flows and automatic rebalancing do not use the
observation path.
