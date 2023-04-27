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

We recommend that each position should describe what will happen if it's the
vote winner. When some of the options are just saying "don't do the thing", it's
helpful to identify which thing they're not doing. See the ContractGovernor
section below for examples.

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

We want some contracts to be able to make the manner of their governance
legible. Contracts can specify aspects that are governed by a public process,
specifically:

* changes to declared parameters
* invocation of declared methods
* blocking exercise of some invitations

The governance package makes it possible for contracts to provide *legiblity*,
meaning that observers (clients and voters) are able to see who has control, and
what actions can be taken. To make control of parameters legible, the contract
will hold its mutable state in a ParamManager. ParamManager has facets for
accessing the param values, and for setting them. The APIs that allows setting
the values and that can make particular changes to the behavior of the contract
will only be accessible to an external ContractGovernor.

The governed contract will only retain the accessor facet internally, and will
also allow external observers to see those values. The private facet, which can
change the values, is only accessible to the visible ContractGovernor. The
ContractGovernor makes the Electorate visible, while tightly controlling the
process of creating new questions and presenting them to the electorate.

The governor starts up the Contract and can see what parameters and APIs are
subject to governance. It provides private facets that carry the ability to
request votes on changing parameters and invoking the controlled APIs. At some
point, we may add governance control over the process and schedule of calling
those votes, but that hasn't been planned in detail yet.

The party that has the question-creating facet of the ContractGovernor can
create questions on parameters or APIs for that contract instance. The
electorate object creates new questions, and makes a new instance of a
VoteCounter so everyone can see how questions will be counted.
Electorates have a public method to get from the questionHandle to a question.
Ballots include the questionSpec, the VoteCounter instance and closingRule. For
contract governance, the question specifies the governed contract instance, the
parameter to be changed and proposed new value, or the method to be invoked and
the arguments to be provided.

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

The governed contract uses a ContractHelper to return a (powerful) creator facet
with two methods: `getParamMgrRetriever` (which provides access to read and
modify parameters), and `getLimitedCreatorFacet`, which has the creator facet
provided by the governed contract and doesn't include any powerful governance
capabilities. ContractGovernor starts the governed contract, so it gets the
powerful creatorFacet. ContractGovernor needs access to the paramManager, but
shouldn't share it. So the contractGovernor's `creatorFacet` provides access to
the governed contract's `publicFacet`, `creatorFacet`, `instance`,
`voteOnApiInvocation`, `voteOnOfferFilter` and `voteOnParamChange`. The
contract's owner should treat `voteOnApiInvocation`, `voteOnOfferFilter` and
`voteOnParamChange` as particularly powerful.

The questions for parameter changes have **YES** positions that list the
parameters to be changed and their proposed values. The **NO** positions list
is `{ noChange: parameterNames }`. For API invocation questions, the
**YES** position gives the API name and arguments, while the **NO** position is
`{ dontInvoke: apiMethodName }`. When proposing to change filter settings, the
**YES** position shows the new value (the list of all strings that will be
blocked), while **NO** has the same strings under `dontUpdate`:
`{ dontUpdate: strings }`.

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
manage their parameters. `makeParamManager()` is designed to be called
within the managed contract so that internal access to the parameter values is
synchronous. A separate facet allows visible management of changes to the
parameter values.

`makeParamManager(zoe)` makes a ParamManager:

```javascript
  const paramManager = await makeParamManager(
    {
      'MyChangeableNumber': ['nat', startingValue],
      'ContractElectorate': ['invitation', initialPoserInvitation],
    },
    zcf.getZoeService(),
  );

  paramManager.getMyChangeableNumber() === startingValue;
  paramManager.updatetMyChangeableNumber((newValue);
  paramManager.getMyChangeableNumber() === newValue;
```

If you don't need any parameters that depend on the Zoe service, there's
an alternative function that returns synchronously:
```javascript
  const paramManager = await makeParamManagerSync(
    {
      'Collateral': ['brand', drachmaBrand],
    },
  );
```

See [ParamTypes definition](./src/constants.js) for all supported types. More
types will be supported as we learn what contracts need to manage. (If you find
yourself using 'addUnknown', let us know!)

### Governing APIs

`ContractGovernor` has support for contracts that declare that some internal
APIs should only be invoked under the control of governance. To opt in to this
support, the contract should include `getGovernedApis` in its creator facet
(passed to `wrapCreatorFacet`). That method should return a `Far` object with
the methods to be called.

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
(`augmentPublicFacet()` and `makeGovernorFacet()`) that add
required methods to the public and creator facets. Since the governed contract
uses the values passed in `terms` to create the paramManager, reviewers of the
contract can verify that all and only the declared parameters are under the
control of the paramManager and made visible to the contract's clients.

Governed methods and parameters must be included in terms.

```javascript
  terms: {
    governedParams: {
      [MALLEABLE_NUMBER]: { type: ParamTypes.NAT, value: number },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: invitationAmount,
      },
    },
    governedApis: ['makeItSo'],
  },
```

When a contract is written without benefit of `contractHelper`, it is
responsible for adding `getSubscription`, and
`getGovernedParams` to its `PublicFacet`, and for adding
`getParamMgrRetriever`, `getInvitation` and `getLimitedCreatorFacet` to its 
`CreatorFacet`.

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

## Reading data off-chain

Governed contracts publish along with the contract they're governing. See [../inter-protocol/README.md].

Committee contracts also publish the questions posed. These can then be followed off-chain like so,
```javascript
  const key = `published.committee.questions`; // or whatever the stream of interest is
  const leader = makeDefaultLeader();
  const follower = makeFollower(storeKey, leader);
  for await (const { value } of iterateLatest(follower)) {
    console.log(`here's a value`, value);
  }
```

### Demo

Start the chain in one terminal:
```sh
cd packages/cosmic-swingset
make scenario2-setup scenario2-run-chain-economy
```
Once you see a string like `block 17 commit` then the chain is available. In another terminal,
```sh
# shows keys of the committees node
agd query vstorage keys 'published.committees'
# shows keys of the economic committee node
agd query vstorage keys 'published.committees.Economic_Committee'
# follow questions
agoric follow :published.committees.Economic_Committee.latestQuestion
```
Note that there won't be `'published.committees.Economic_Committee.latestQuestion` until some `.addQuestion()` call executes.
