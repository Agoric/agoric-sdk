# Inert proposal to test acceptance of the history of upgrades

Its `type` is `/cosmos.params.v1beta1.ParameterChangeProposal` because that is
the lightest form of actual proposal to execute. It runs the [eval.sh](./eval.sh)
script, which does nothing.

## To consider testing here

### Offer result vows

#9308 updated the smart-wallet to support offer results that are vows and resolve them after the source vat restarts. The staker proposal had a test that it worked but we may want to have an acceptance test to ensure it always does. E.g. by producing a vow in an earlier layer, restarting the vat in this layer, then in a test triggering its resolution and confirming the result.
