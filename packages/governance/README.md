# Governance

This package provides Electorates and VoteCounters to create a general
framework for governance. It has implementations for particular kinds of
electorates and different ways of tallying votes.

The electorates and VoteCounters are self-describing and reveal what they are
connected to so that voters can verify that their votes mean what they say and
will therefore be tabulated as expected.

Any occasion of governance starts with the creation of an Electorate. Two kinds
exist currently that represent committees (elected or appointed) and
stakeholders (Stakeholder support is in review). The electorate may deal with
many questions governing many things, so the electorate has to exist before any
questions can be posed.

The next piece to be created is an ElectionManager. (Contract Governor, one
implementation, is discussed below). An ElectionManager deals with a
particular Electorate. It supports creation of questions, and can manage
what happens with the results. The ElectionManager
is responsible for specifying which VoteCounter will be used with any
particular question. Different VoteCounters will handle elections with two
positions or more. The architecture supports vote counters for
[majority decisions](https://en.wikipedia.org/wiki/Majority_rule),
[approval voting](https://en.wikipedia.org/wiki/Approval_voting), and
[proportional representation](https://en.wikipedia.org/wiki/Proportional_representation),
as well as [quadratic](https://en.wikipedia.org/wiki/Quadratic_voting),
[instant runoff](https://en.wikipedia.org/wiki/Category:Instant-runoff_voting),
and more esoteric approaches.

When a question is posed, it is only with respect to a particular Electorate,
(which identifies a collection of eligible voters) and a particular vote
counting contract. The QuestionSpec consists of `{ method, issue, positions,
electionType, maxChoices }`. The issue and positions can be strings or
structured objects. Method is one of UNRANKED and ORDER, which is sufficient to
describe all the most common kinds of votes. A vote between two candidates or
positions uses UNRANKED with a limit of one vote. ORDER will be useful for
Single Transferable Vote or Instant Runoff Voting. ElectionType distinguishes
PARAM_CHANGE, which has structured questions, from others where the issue is
represented by a string.

When posing a particular question to be voted on, the closingRule has to be
specified. When voters are presented with a question to vote on, they have
access to QuestionDetails, which includes information from the QuestionSpec, the
closingRule, and the VoteCounter instance. The VoteCounter has the Electorate
in its `terms`, so voters can verify it.

Voters get a voting facet via an invitation, so they can reliably identify the
Electorate. They can subscribe with the electorate to get a list of new
questions. They can use the questionHandle from each update from the
subscription to get the questionDetails. Voters cast their vote by sending their
selected position(s) to their electorate, which they know and trust.

This structure of Electorates and VoteCounters allows voters and observers to
verify how votes will be counted, and who can vote on them, but doesn't
constrain the process of creating questions. ElectionManagers make that process
visible. ContractGovernor is a particular example of that that makes it possible
for a contract to publish details of how its parameters will be subject to
governance.

## Electorate

An Electorate represents a set of voters. Each voter receives an invitation
for a voterFacet, which allows voting in all elections supported by
that electorate. The Electorate starts a new VoteCounter instance for each
separate question, and gets the `creatorFacet`, which carries the `submitVote()`
method that registers votes with the voteCounter. The Electorate is responsible
for ensuring that `submitVote()` can only be called with the voter's unique
voterHandle.

## ContractGovernor

We want some contracts to be able to make it visible that their internal
parameters are controlled by a public process, and allow observers to see who
has control, and how those changes can happen. To do so, the contract will
use a ParamManager to hold its mutable state. ParamManager has facets for
accessing the param values and for setting them. The governed contract would use
the access facet internally, and make that visible to anyone who should be able
to see the values, while ensuring that the private facet, which can change the
values, is only accessible to a visible ContractGovernor. The ContractGovernor
makes the Electorate visible, while tightly controlling the process of
creating new questions and presenting them to the electorate.

The governor starts up the Contract and can see what parameters are subject to
governance. It provides a private facet that carries the ability to request
votes on changing particular parameters. Some day we may figure out how to make
the process and schedule of selecting parameter changes to vote on also subject
to governance, but that's too many meta-levels at this point.

The party that has the question-creating facet of the ContractGovernor can
create a question that asks about changing a particular parameter on the
contract instance. The electorate object creates new questions, and makes a new
instance of a VoteCounter so everyone can see how questions will be counted.

Electorates have a public method to get from the questionHandle to a question.
Ballots include the questionSpec, the VoteCounter instance and closingRule. For
contract governance, the question specifies the governed contract instance, the
parameter to be changed, and the proposed new value.

This is sufficient for voters and others to verify that the contract is managed
by the governor, the electorate is the one the governor uses, and a particular
voteCounter is in use.

The governed contract can be inspected to verify that some parameter values are
held in a ParamManager, and that a ContractGovernor can cleanly start it up and
have exclusive access to the facet that allows the values to be set. The
contract would also make the read-only facet visible, so others can see the
current values. The initial values of the parameters, along with their types
remain visible in the contract's `terms`. Contracts should be written so that
it's easy to tell that the ParamManager, with its ability to change the
parameter values (and access any powerful invitations) is only used in limited
ways, and is only passed to objects that treat it as a sensitive resource.

The governed contract uses a ContractHelper to return a (powerful) creatorFacet
with two methods: `getParamMgrRetriever` (which provides access to read and
modify parameters), and `getLimitedCreatorFacet`, which has the creator facet
provided by the governed contract and doesn't include any powerful governance
capabilities. ContractGovernor starts the governed contract, so it gets the
powerful creatorFacet. ContractGovernor needs access to the paramManager, but
shouldn't share it. So the contractGovernor's creatorFacet provides access to
the governed contract's publicFacet, creatorFacet, instance, and
`voteOnParamChange()`, which the contract's owner should treat as powerful. 

### Governing Electorates

In order to allow the Electorate that controls the ContractGovernor to change,
the Electorate is a required parameter in all governed contracts. Invitations
are an unusual kind of managed parameter. Most parameters are copy-objects that
don't carry any power. Since invitations convey rights, only the
invitation's amount appears in `terms`. The actual invitation must
be passed  to the contract using `privateArg`. This combination makes it
possible for clients to see what the invitation is for, but only the contract
has the ability to exercise it. Similarly, when there will be a vote to change
the Electorate (or any other Invitation-valued parameter), observers can see the
amount. When contracts are written so the handling of the ParamManager is
clearly limited, reviewers can see that the actual invitation will only be
exercised if/when the vote is successful.

### ParamManager

`ContractGovernor` expects to work with contracts that use `ParamManager` to
manage their parameters. `makeParamManagerBuilder()` is designed to be called
within the managed contract so that internal access to the parameter values is
synchronous. A separate facet allows visible management of changes to the
parameter values.

`makeParamManagerBuilder(zoe)` makes a builder for the ParamManager. The
parameters that will be managed are specified by a sequence of calls to the
builder, each describing one parameter. For instance, such a sequence might look
like this:

``` javascript
return makeParamManagerBuilder()
  .addNat(CHARGING_PERIOD_KEY, loanTiming.chargingPeriod)
  .addNat(RECORDING_PERIOD_KEY, loanTiming.recordingPeriod)
  .addRatio(INITIAL_MARGIN_KEY, rates.initialMargin)
  .addRatio(LIQUIDATION_MARGIN_KEY, rates.liquidationMargin)
  .addRatio(INTEREST_RATE_KEY, rates.interestRate)
  .addRatio(LOAN_FEE_KEY, rates.loanFee)
  .build();
```

Each `addType()` call returns the builder, so the next call can continue the
call cascade. At the end, `.build()` is called. One of the calls,
`addInvitation()`, is `async`, so it can't be cascaded.

``` javascript
  const paramManagerBuilder = makeParamManagerBuilder(zoe)
    .addBrand('Currency', drachmaBrand)
    .addAmount('Amt', drachmaAmount);
  // addInvitation is async, so it can't be part of the cascade.
  await paramManagerBuilder.addInvitation('Invite', invitation);
  const paramManager = paramManagerBuilder.build();
```

The parameter values are retrieved by name. A separate facet of the paramManager
allows the holder to call `updateFoo()` to change the value. ContractGovernor
wraps that facet up so its usage is visible.

Current supported methods for adding parameters include 'addAmount', 'addBrand',
'addInstance', 'addInstallation', 'addInvitation', 'addNat', 'addRatio',
'addString', and 'addUnknown'. The list can be extended as we find more types
that contracts want to manage. (If you find yourself using 'addUnknown', let us
know, as that's a sign that we should support a new type). 

### Governed Contracts

`contractHelper` provides support for the vast majority of expected clients that
will have a single set of parameters to manage. A contract only has to define
the parameters (including `CONTRACT_ELECTORATE`) in a call to
`handleParamGovernance()`, and add any needed methods to the public and creator
facets. This will
 * validate that the declaration of the parameters is included in its `terms`,
 * add the parameter retriever appropriately to the publicFacet and creatorFacet

It's convenient for the contract to export a function (e.g. `makeParamTerms`)
for the use of those starting up the contract to insert in the `terms`. They
would otherwise need to write boilerplate functions to declare all the required
parameters.

When a governed contract starts up, it should get the parameter declarations
from `terms`, use them to create a paramManager, and pass that to
`handleParamGovernance`. `handleParamGovernance()` returns functions
(`wrapPublicFacet()` and `wrapCreatorFacet()`) that add
required methods to the public and creator facets. Since the governed contract
uses the values passed in `terms` to create the paramManager, reviewers of the
contract can verify that all and only the declared parameters are under the
control of the paramManager and made visible to the contract's clients.

When a contract is written without benefit of `contractHelper`, it is
responsible for adding `getSubscription`, `getContractGovernor`, and
`getGovernedParams` to its `PublicFacet`, and `getParamMgrRetriever`,
`getInvitation` and `getLimitedCreatorFacet` to the `CreatorFacet`.

## Scenarios

### Examining a Contract before use

Governed contracts will make their governor and parameters visible, either
through `terms` or the public facet. The governor, in turn, publicly shares
the electorate, which makes the list of questions visible. The questions show
their voteCounters, which makes it possible to tell how the counting will be
done.

There isn't currently a way to verify the process of creating new questions.
We'll eventually need to spin a story that will make that more legible.
Currently, the ability to create new governance questions is provided as a
private facet that contains only the method `voteOnParamChange()`. 

When a prospective user of a contract receives a link to an instance of a
contract, they can check the `terms` to see if the contract names a governor.
The governor's public facet will also refer to the contract it governs. Once you
have the instance you can retrieve the installation from Zoe which allows you to
examine the source.

The governed contract will provide the electorate, which allows you to check the
electorate, and retrieve a list of open questions. (We should add closed
questions and their resolution as well.) Each question refers to the
voteCounter it uses.

### Participating in Governance

Voters are managed by an Electorate. Prospective voters should only accept a
voting API as the outcome of an invitation. The invitation allows you to verify
the particular electorate instance in use. The electorate's public facet has
`getQuestionSubscription()`, which allows you to find out about new questions
for the electorate and `getOpenQuestions()` which lists questions that haven't
been resolved.

Each question describes its subject. One field of the questionDetails is
`ElectionType`, which can be `PARAM_CHANGE`, `ELECTION`, or `SURVEY`. (I'm sure
we'll come up with more types.) When it is `PARAM_CHANGE`, the questionDetails
will also identify the contract instance, the particular parameter to be
changed, and the proposed new value. At present, all parameter change elections
are by majority vote, and if a majority doesn't vote in favor, then no change is
made.

## Future Extensions

The architecture is intended to support several scenarios that haven't been
filled in yet.

### Electorates

The initial Electorate represents a Committee, with has an opaque group of
voters. The
contract makes no attempt to make the voters legible to others. This might be
useful for a private group making a decision, or a case where a dictator has the
ability to appoint a committee that will make decisions.

ShareHolders is an Electorate that gives the ability to vote to anyone who has
an Attestation payment from the Attestation contract. Observers can't tell who
the voters are, but they can validate the qualifications to vote.

Another plausible electorate would use the result of a public vote to give
voting facets to the election winners. There would have to be some kind of
public registration of the identities of the candidates to make them visible.

### VoteCounters

The only vote counter currently is the BinaryVoteCounter, which presumes
there are two positions on the ballot and assigns every vote to one or the other
or to 'spoiled'. At the end, it looks for a majority winner and announces that.
It can be configured to have one of the possible outcomes as the default
outcome. If there's a tie and no default, the winner is `undefined`.

ContractGovernance uses this to make 'no change' be the default when voting on
parameter changes.

We should have voteCounters for multiple candidate questions. I hope we'll
eventually have IRV (instant runoff) and various forms of proportional
representation.

### ElectionManager

The election manager has a role in governance, but not a specific API. The
manager's role is to make the setup of particular elections legible to voters
and other observers. The current example is the ContractGovernor, which manages
changes to contract parameters. There should also be managers that

* take some action (i.e. add a new collateral type to the AMM) when a vote
  passes.
* manage a plebiscite among stake holders to allow participants to express
  opinions about the future of the chain.
