# Governance

This package provides Registrars, BallotsCounters, and Ballots to create a
general framework for governance. It has implementations for
particular kinds of electorates and different ways of tallying votes.

Instances of each are self-describing and reveal what they are connected to so
that voters can verify that their votes mean what they say and will be tabulated
as expected.

Any occasion of governance starts with the creation of a Registrar. Two
kinds exist currently that represent committees and stakeholders. The
electorate may deal with many questions governing many things, so the electorate
has to exist before any questions can be posed.

The next piece to be created is an ElectionManager. (A Contract Governor, is a
particular example, discussed below). An ElectionManager is tied to a particular
Registrar. It has rules for who can create questions, what happens with the
results, and may limit the kinds of ballots it can handle.

When a question is posed, it is only with respect to a particular Registrar,
(which identifies a collection of eligible voters) and a particular ballot
counting contract. The BallotSpec consists of { choiceMethod, question,
positions, and maxChoices }. The question and positions are strings.
ChoiceMethod is one of CHOOSE_N, ORDER, and WEIGHT, which is sufficient to
describe all the most common kinds of votes. A vote between two candidates or
positions is CHOOSE_N of two. ORDER handles Single Transferable Vote, and WEIGHT
supports approval voting.

When posing a particular question to be voted on, the closingRule also has to be
specified. When voters are presented with a Ballot to vote on, they have access
to BallotDetails, which includes a BallotSpec, the closingRule, and the
BallotCounter instance. The BallotCounter has the Registrar in its terms, so
voters can verify it.

Voters get a voting facet via an invitation, so they're sure they're
connected to the Registrar that's responsible for this vote. They can get a
notifier from the registrar to find out about new questions. They can use the
question name from the notifier to get a ballotKit. After they fill out a
ballot, they submit it by sending it to their registrar, whcih they know and
trust.

This structure of Registrars and Ballots allows voters and observers to verify
how ballots will be counted, and who can vote on them, but doesn't constrain
the process of creating questions. ElectionManagers make those answers visible.
ContractGovernor is a particular example of that that makes it possible for a
contract to publish details of how its parameters will be subject to governance.

## ContractGovernor

We want some contracts to be able to make it visible that their internal
parameters can be controlled by a public process, and allow observers to see
who has control, and how those changes can happen. To do so, the contract would
incorporate a ParamManager, which has publishable facets to provide access to
those parameters, and a privateFacet, shared only with a ContractGovernor, which
can make the Registrar visible, while tightly controlling the process of
creating new questions and presenting them to the electorate.

The governor knows about a specific Contract and can see what
params are subject to governance. It provides a private facet that carries the
ability to request votes on changing particular parameters. Some day we may
figure out how to make the process and schedule of selecting parameter changes
to vote on also subject to governance, but that's too many meta-levels at this
point.

The party that has the question-creating facet of the ContractGovernor can
create a question that asks about changing a particular parameter on a
particular contract instance. The registrar creates new questions, and makes a
new instance of a BallotCounter so everyone can see how ballots will be counted.

ContractGovernor will have a public method to get from the question name (unique
within the ContractGovernor) to a ballotKit.

a ballotKit for a question created by a ContractGovernor has { ballotTemplate,
BallotCounterInstance, Registrar, ContractGovernor, contractInstance }.

This is sufficient for voters and others to verify that the contract is managed
by the governor, the registrar is the one the governor uses, and a particular
ballotCounter is in use.

