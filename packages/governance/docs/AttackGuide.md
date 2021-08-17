# An Attacker's guide to Agoric Governance

This is an incomplete list of potential weak points that an attacker might want to focus on when looking for ways to violate the integrity of the governance system. It's here to help defenders, but "attacker's mindset" is a good way to focus attention for the defender. The list should correspond pretty closely to the set of assurances that the governance system aims to support.

I see two main kinds of threats here:

 * bugs or oversights in the infrastructure
 * attacks on voters
 * mistakes that might arise in governed contracts 

The first two can be mitigated by validation functions that cross-check linkages.

I'm not as sure how to address the third, except better documentation, and support for custom validation functions.


# Get a voter facet you shouldn't have

Every module that handles voter facets should handle them carefully and ensure they don't escape. If you 

# Get a ballotCounter to accept votes from a single voter without replacement

I can't think of a way to evade the way BinaryBallotCounter handles this, but it's something to be aware of with new BallotCounters, and particularly in combination with new Registrars.

# Break notification so voters don't hear about elections

This would be a minor issue, but the notifications are the only mechanism we proved for announcing new issues.

# Leak the ability to create new questions

Currently creating new questions is seen as tightly held. If that is loosened in a new Registrar or ElectionManager, that provides a path for spamming voters.

# What shenanigans can be caused by creating multiple questions with the same or very similar text?

The question text used to be unique, but each ballot question now has a handle for disambiguation. Voters ought to validate the particulars of any question they intend to vote on. Can they be confused by corrections or replacement? Is there a vulnerability here, or just a UI support need?

# Create a Ballot that refers to a different BallotCounter than the one the registrar will use
# (Attacker) distribute ballots that don't match the official one from the Registrar

Ballots themselves are not secure. The voter has to get a copy of the ballot from the Registrar to have any assurance that it's valid. If someone else provides a ballot, they can replace various pieces to fool the voter as to what is being voted on.

# Ordinary bugs in counting ballots, reporting, etc.

If the code in BallotCounter, Registrar, ContractGovernor has subtle mistakes, wrong results will obtain.

# Produce a discrepancy between Terms and actions in BallotCounter or Registrar

The voter's assurance that a particular ballot has the effect they expect arises in part because the `terms` in the BallotCounter, Registrar, etc. dictate how those classes will act. If the code is changed to get info from hidden parameters or to ignore some of the terms, voters will be misled.

# Use a timer that is controlled by a party to the vote

Everyone involved relies on the timers used to close voting being platform timers, but the timers aren't self-revealing. Participants should compare the timers to known platform-provided timers before relying on them.

# Registrar allow unauthorized parties to cast ballots

Every registrar will have some notion of who the authorized voters are. They need to properly enforce that each voter can vote their weight once. The current implementations only support equal weight ballots and known lists of voters. Future Registrars and BallotCountes will support other models.  The combination of open-entry stake-holder votes with variable weight ballotCounters will require even more diligence to ensure there are no avenues for multiply counting votes.

# Registrar accidentally re-use a ballotCounter

Each ballotCounter is intended to be used once. If there's a path that allows re-use, this could be a hazard.

# Does failed question creation throw detectably?

When creating new questions, there is a lot of checking for valid combinations of parameters. Automated question creators need to be able to detect failures, so they don't assume success when they shouldn't.

# Does submission of an incorrect ballot throw detectably?

Similarly, if voters contstruct their votes incorrectly, they need a way to detect that something went wrong.

# Some vote outcome doesn't update notifiers correctly

There are a couple of paths (quorum-counting, tie detection, the count itself) after a vote is closed before the outcome is declared. If something goes wrong, that needs to be detected and an appropriate outcome signalled.

# Timing attacks on parameter updates or vote outcomes

This is vague and not very coherent. I'm thinking about racees to update a single parameter, which falls more along the lines of confusing the electorate than a weakness in the protocols or infrastructure.


# Get contractGovernor to leak paramManager private facet

The contractGovernor tries to ensure that the facet for calling updateFoo for a particular paramManager is only available in a visible way, but the code there is delicate. Is there a way to highjack the facet that wouldn't be detectable to voters or onlookers?


# Create ballot issue that claims to govern a contract it doesn't have control over

It's possible to insert a layer between the contractGovernor and the paramManager or governedContract that allows external control of the parameters. Is there a way to do so that wouldn't be detected by the validators we've provided? The double linkage between governedContract and contractGovernor is supposed to ensure that an inserted layer would be obvious. Is there a way to evade that detection?

 
# Other Discrepancy between governedContract and ContractGovernor

Are there ways to write governedContracts so they appear to be handled by contractGovernor, but other intervention in the update parameters is possible?

# Can a cheating governor start up a contract with invisible wrapper undetectably?

If someone wrote a variant contractGovernor, how hard would it be to tell whether they had missed some of these checks?

# Get a contract to install ParamManager incorrectly, so ContractGovernor can't update values
# Write a contract that configures ParamManager incorrectly so some params are broken
# write the update responder incorrectly so intended action in response to votes don't occur
# Contract has additional restrictions on parameter value, so value update fails after vote passes

These effectively count as contract bugs. If the contract is written so that some contract updates would cause it to be inoperable, then it's incumbent on the operators to ensure that those parameter values aren't proposed unless the goal is shutdown. 