<!--
order: 1
-->

# Concepts

## Notes on Terminology

* "Bonded", "delegated", and "staked" are all synonyms.
* "Unlocking" is a time-delayed process by which tokens become available for
  withdrawal. "Vesting" is a time-delayed process where tokens change
  ownership, and is subject to "clawback" which stops the process. The
  cosmos-sdk implements several kinds of "vesting account" which implement
  unlocking, not vesting.

## Account Balances

The existing dynamic of account balances work in two dimensions: bonding
and locking.

### The Bonding Dimension

In the bonding dimension, the balance of the staking token owned by an account
is partitioned into three categories:

* "Bonded": tokens that are currently staked with a validator.
* "Unbonding": tokens that are held in escrow after being bonded and subject
  to slashing if validator misbehavior is discovered after the fact.
* "Unbonded": tokens that are not bonded and unencumbered by any slashing
  liability. These are the only tokens that are shown in the account balance
  in the `x/bank` module.

### The Locking Dimension

In the locking dimension, the balance of tokens owned by an account is
partitioned into two categories:

* "Locked" (aka "vesting" or "unvested"): tokens which may not yet be
  transfered out of the account.
* "Unlocked" (aka "vested"): tokens which may be freely transferred
  out of the account.

The sum of these two categories must be equal to the sum of the three
categories in the bonding dimension.

### No Cartesian Product

Surprisingly, tokens are *not* tracked by the cartesian product of the
dimensions, i.e. the system does not track whether the tokens staked to
a particular validator are locked or unlocked. Instead, when trying to
transfer tokens out of an account, it checks separately whether enough
unbonded tokens are available, and whether enough unlocked tokens are
available, and deducts the transferred amount from both of those
categories.

Slashed tokens are taken out of the locked category until it is depleted,
and then from the unlocked category.

## Introducing Liens

Liens are an encumbrance on tokens that prevent them from being transferred
out of the account, much like locking (and liens are implemented by reusing
the locking mechanisms).  Liens create a two-category partition of the
account balance, much like locking:

* "Liened": tokens encumbered by a lien which may not be transferred.
* "Unliened": the remainder of tokens in an account which are not so
  encumbered.

Liens are imposed and lifted by the higher Agoric swingset layer.
We intend liens to be placed on bonded, unlocked tokens only. However,
we cannot force tokens to remain bonded, as they may be involuntarily
unbonded when a validator retires. The best we can do is that when
the higher layers wish to increase the total liened amount, the new
total must be less than the bonded tokens and less than the unlocked
tokens.  Liens can be lifted at any time.

The liened amount is *not* reduced by slashing, and if slashing reduces
the account balance below the liened amount, the account effectively has
negative equity.  We'll model this by allowing the Unliened amount to
be negative.

## Representing Account State

Putting all three dimensions together, the account state is:

* Bonding Dimension:
    * Bonded
    * Unbonding
    * Unbonded
* Locking Dimension:
    * Locked
    * Unlocked
* Lien Dimension:
    * Liened
    * Unliened (may be negative)

with the constraint that the sum of categories in each dimension must be
the same. We can represent this without the constraints with the following
primary quantities:

* Total: total amount in the account
* Bonded
* Unbonding
* Locked
* Liened

which gives rise to the derived quantities:

* Unbonded = Total - (Bonded + Unbonding)
* Unlocked = Total - Locked
* Unliened = Total - Liened (may be negative)

## Implementing Lien Encumbrance

Liened tokens may not be transferred out of an account. Rather than
modifying the `x/bank` module to implement a new type of containment,
we leverage the existing mechanism to prevent locked tokens from being
transferred.

To do this, we create a new type of vesting \[*sic*\] account which wraps
an existing account where the liened tokens are considered locked. If
the existing account is already a vesting account, the wrapper locks the
maximum of the liened and locked amounts.

To effect this wrapping of accounts, a different wrapper is placed around
an `AccountKeeper` which intercepts `GetAccount()` and `SetAccount()` calls
which read and write the account from the store. This way no change is
needed in the persisted representation of accounts.
