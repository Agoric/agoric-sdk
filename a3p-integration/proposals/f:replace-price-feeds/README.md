# CoreEvalProposal to replace existing price_feed and scaledPriceAuthority vats
# with new contracts. Auctions will need to be replaced, and Vaults will need to
# get at least a null upgrade in order to make use of the new prices. Oracle
# operators will need to accept new invitations, and sync to the roundId (0) of
# the new contracts in order to feed the new pipelines.

The `submission` for this proposal is automatically generated during `yarn build`
in [a3p-integration](../..) using the code in agoric-sdk through
[build-all-submissions.sh](../../scripts/build-all-submissions.sh) and
[build-submission.sh](../../scripts/build-submission.sh).
