# An Attacker's guide to Smart Wallets

This is an incomplete list of potential weak points that an attacker might want to focus
on when looking for ways to violate the integrity of Smart Wallets. It's here to help
defenders, as "attacker's mindset" is a good way to focus attention for the defender. The
list should correspond pretty closely to the set of assurances that Smart Wallest aims
to support.

## Factory

This is the contract instance. It is responsible for,

- provisioning wallets
- passing them messages over the bridge
- maintaining state through upgrade

## Individual Wallet

The design assumes that assets pass only in these ways:

1. IN on the `deposit` facet
2. IN by proceeds of an offer (`getPayouts()`)
3. OUT by making an offer

## Types of attack

### Theft

The wallet instances rest on the ocap model

### Destruction

No matter what message the contract must not drop any assets into the void. Pay special attention to the time between an offer withdrawing payments from the wallet's purse(s) and the payouts being deposited (or it being refunded for wants not satisfied).

If the attacker could force a fatal error somewhere (perhaps in their own wallet) it would terminate the vat, which holds the factory and all the wallets. Are the offer processing states robust to termination? For example, what happens if you withdraw $10 from your purse to a payment for your offer and the vat dies before you take payouts?

### Denial of service

#### Resource exhaustion

The factory provides wallets and to do so much keep a hold of all wallets
produced. To mitigate, these shouldn't be held in RAM. By design they are in a
ScaleBigMapStore backed by disk.

The wallet object holds many types of state. The state must not grow monotonically over use or an attacker could grow the cost of holding the wallet in RAM to so much that it kills the vat.

### Deadlock

If an attacker can craft a message that leads some part of the code to deadlock or wait indefinitely, this could prevent use.
