User-visible changes in @agoric/zoe:

## Release 0.2.0 (21-Jan-2020)

* Changes the payout rule kinds to only two kinds: offerAtMost and wantAtLeast (Issue #101)
* Changes one of the exit conditions (noExit) to waived (Issue #107)
* Removes escrow receipts entirely and replaces them with invites to contracts.
* All offers to Zoe must redeem a Zoe invite (Issue #102)
* Contracts use units rather than extents. (Issue #99)
* Mentions of "exit safety" replaced by "payout liveness" (Issue #361)

## Release 0.1.2 (17-Dec-2019)

Refactored the internals of Zoe. No user-visible changes.
