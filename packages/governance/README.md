# Governance

This package provides Registrars, BallotsCounters, and Ballots to create a
general framework for governance. It has implementations for particular kinds of
electorates and different ways of tallying votes.

Instances of each are self-describing and reveal what they are connected to so
that voters can verify that their votes mean what they say and will be tabulated
as expected.

Any occasion of governance starts with the creation of a Registrar. Two kinds
exist currently (Stakeholder support will be added shortly] that represent
committees and stakeholders. The electorate may deal with many questions
governing many things, so the electorate has to exist before any questions can
be posed.

The next piece to be created is an ElectionManager. (A Contract Governor, is a
particular example, discussed below). An ElectionManager is tied to a particular
Registrar. It supports creation of questions, can manage what happens with the
results, and may limit the kinds of ballots it can handle.

When a question is posed, it is only with respect to a particular Registrar,
(which identifies a collection of eligible voters) and a particular ballot
counting contract. The BallotSpec consists of { choiceMethod, question,
positions, electionType and maxChoices }. The question and positions are
strings. ChoiceMethod is one of CHOOSE_N, ORDER, and WEIGHT, which is sufficient
to describe all the most common kinds of votes. A vote between two candidates or
positions is CHOOSE_N of two. ORDER handles Single Transferable Vote, and WEIGHT
supports approval voting. electionType distinguishes PARAM_CHANGE, which has
structured questions from others, where the question is a string.

When posing a particular question to be voted on, the closingRule also has to be
specified. When voters are presented with a Ballot to vote on, they have access
to BallotDetails, which includes a BallotSpec, the closingRule, and the
BallotCounter instance. The BallotCounter has the Registrar in its terms, so
voters can verify it.

Voters get a voting facet via an invitation, so they're sure they're connected
to the Registrar that's responsible for this vote. They can get a notifier from
the registrar to find out about new questions. They can use the ballot handle
from the notifier to get a ballot. After they fill out a ballot, they submit it
by sending it to their registrar, which they know and trust.

This structure of Registrars and Ballots allows voters and observers to verify
how ballots will be counted, and who can vote on them, but doesn't constrain the
process of creating questions. ElectionManagers make those answers visible.
ContractGovernor is a particular example of that that makes it possible for a
contract to publish details of how its parameters will be subject to governance.

## ContractGovernor

We want some contracts to be able to make it visible that their internal
parameters can be controlled by a public process, and allow observers to see who
has control, and how those changes can happen. To do so, the contract would
incorporate a ParamManager, which has a public facet that provides access to
those parameters, and a privateFacet, shared only with a ContractGovernor, which
can make the Registrar visible, while tightly controlling the process of
creating new questions and presenting them to the electorate.

The governor starts up the Contract and can see what params are subject to
governance. It provides a private facet that carries the ability to request
votes on changing particular parameters. Some day we may figure out how to make
the process and schedule of selecting parameter changes to vote on also subject
to governance, but that's too many meta-levels at this point.

The party that has the question-creating facet of the ContractGovernor can
create a question that asks about changing a particular parameter on the
contract instance. The registrar creates new questions, and makes a new instance
of a BallotCounter so everyone can see how ballots will be counted.

Registrars have a public method to get from the ballot handle to a ballot.
ballots include the ballotSpec, the BallotCounter instance and closingRule. For
contract governance, the question specifies the governed contract instance, the
parameter to be changed, and the proposed new value.

This is sufficient for voters and others to verify that the contract is managed
by the governor, the registrar is the one the governor uses, and a particular
ballotCounter is in use.

## Scenarios

### Examining a Contract before use

Governed contracts will make their governor and parameters visible, either
through the terms or the public facet. The governor, in turn, publicly shares
the registrar, which makes the list of questions visible. The questions show
their ballotCounters, which makes it possible to tell how the counting will be
done.

There isn't currently a way to verify the process of creating new questions.
We'll eventually need to spin a story that will make that more legible.
Currently, the abilty to create new governance questions is provided as a
private facet that contains only the method voteOnParamChange(). 

When a prospective user of a contract receives a link to an instance of a
contract, they can check the terms to see if the contract names a governor.  The
governor's public facet will also refer to the contract it governs. With the
instance links you'll eventually be able to retrieve the installation from Zoe
(https://github.com/Agoric/agoric-sdk/issues/3449), which allows you to examine
the souce.

The governedContract will provide the registrar, which allows you to check the
electorate, and retrieve a list of open questions. (We should add closed
questions and their resolution as well.) Each question refers to the
ballotCounter it uses.

### Participating in Governance

Voters are managed by a Registrar. Prospective voters should only accept a
voting API as the outcome of an invitation. The invitation allows you to verify
the particular registrar instance in use. The registrar's public facet has
`getQuestionNotifier()`, which allows you to find out about new questions for
the electorate and `getOpenQuestions()` which lists questions that haven't been
resolved.

Each question describes its subject. One field of the ballotDetails is
`ElectionType`, which can be `PARAM_CHANGE`, `ELECTION`, or `SURVEY`. (I'm sure
we'll come up with more types.) When it is `PARAM_CHANGE`, the ballotDetails
will also identify the contract instance, the partcular parameter to be changed,
and the proposed new value. At present, all parameter change elections are by
majority vote, and if a majority doesn't vote in favor, then no change is made.
