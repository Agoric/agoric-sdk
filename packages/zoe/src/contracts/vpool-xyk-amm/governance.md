# Governance and the Multipool AMM

This contract has two parameters (poolFee and protocolFee) that are
managed under the governance framework. The contract calls
`handleParamGovernance()` at startup, which allows a contractManager to call for
votes that would change the parameter values in a transparent way. When
correctly set up, customers with access to this contract's publicFacet can
verify the connectivity, and see which Electorate has the ability to vote on
changes, and which votes are ongoing or have taken place. If not correctly set
up, the validation checks will fail visibly.

## Parameter Governance

params.js declares PoolFee and ProtocolFee both Bigints, which
can bu update by a governance vote. The contract gets the initial values for
those parameters from its terms, and thereafter can be seen to only use the
values provided by the `getParamValue()` method returned by the paramManager.

`handleParamGovernance()` adds several methods to the publicFacet of the
contract, and bundles the privateFacet to ensure that governance functionality
is only accessible to the contractGovernor. The added public methods are

 * getSubscription: get Subscription that updates when votes are called
 * getContractGovernor: returns the contractGovernor for verification
 * getGovernedParamsValues: returns a structure showing the current values of
   both parameters 
 * getParamValue: allows a request for a description of the current value of
   either parameter

The creatorFacet has one method (makeCollectFeesInvitation, which returns
collected fees to the creator). `handleParamGovernance()` adds internal methods
used by the contractGovernor. The contractGovernor then has access to those
internal methods, and reveals the original AMM creatorFacet to its own creator.
