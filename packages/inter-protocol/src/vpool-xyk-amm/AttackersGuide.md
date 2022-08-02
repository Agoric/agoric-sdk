# An Attacker's guide to the Constant Product AMM

This is an incomplete list of potential weak points that an attacker might want to focus
on when looking for ways to violate the integrity of the AMM. It's here to help defenders,
as "attacker's mindset" is a good way to focus attention for the defender. The list should
correspond pretty closely to the set of assurances that the AMM aims to support.

The main guarantee that an
[Automated Market Maker](https://mason.gmu.edu/~rhanson/mktscore.pdf) makes is that
sufficiently liquid pools will always retain enough collateral through any sequence of
trades to be able to continue trading. The caveat just means that when the amount of
liquidity in the pool is quite small with respect to desired trades, trades will quickly
push the balance to extreme enough prices that no further trading will take place. If the
pool is liquid enough, trades will push the price enough out of equilibrium that it will
be very attractive for arbitrageurs to restore the price. Anything that allows traders or
liquidity providers to violate that expectation is a problem.

## Multiple Pools

`addPool` and `addLiquidity` are publicly available. That means someone could maliciously
create pools or provide insufficient liquidity. The requirement of a minimum initial
liquidity should be enough to prevent misuse of these APIs from hurting us.

Since `addPool` is public, someone could add a look-alike issuer for a well-known
currency and make it harder for people to find the pool they intend to trade with. As
long as people are dealing wiht Brands and Issuers, they shouldn't be confused by
this. Does the Wallet UI provide enough clarity in the face of this?

Zoe holds the collaterral for all the pools in common. We segragate it by Pool, so each
pool's allocation includes some IST (the central currency) and some of another
collateral. The doublePool trades move IST between pools, but Zoe's rights conservation
enforcement ensure that none is ever gained or lost.

## Fees

Fees are collected as trading takes place, and kept in a distinct Zoe seat. The creator of
the AMM should be the only one who can collect the fees. Can that invitation be hijacked
from whoever gets that facet during bootstrap?  Is there another way to steal fees?

Can users structure trades so they can pay less in fees than intended?

## Providing Liquidity

Traders can provide liquidity and get liquidity tokens for a particular pool. The goal is
that they earn a share of the fees that were collected while their liquidity remained in
the pool. Can liquidity providers gain extra fees over other providers, or can they cause
traders to be disadvantaged?

Can liquidity providers extact more from the pool than they should be able to?

## Math

The whole design is predicated on the X*Y=K invariant.  That invariant says that trading
should not change the product of X and Y, but in actuality, roundoff and fees are both
allowed to change the product. Roundoff should increase it ever so slightly, except in
cases where there are small amounts in the pool, where it can be significant. Fees are
added to the pool, so they change the size of the pool, but should be interpreted as
taking place after the trade rebalances the amounts. The equations are explained in detail
in `constantProduct/README.md`.

Adding liquidity adds funds to both pools so, of course, it changes X and Y. But (except
in the case of `AddLiquidityAtRate`), it should keep X and Y in the same proportion.

I don't know whether anyone else has done an implementation of the multi-pool swap that
works like ours. If neither X nor Y is IST, then we trade X for IST and IST for
Y. Attributing fees in this case took some art. This is also addressed in
`constantProduct/README.md`.

Adding liquidity while changing the ratio of assets is done in two steps in order to
prevent people from using a single step as a way to avoid fees on trades. Users shouldn't
be able to use `AddLiquidityAtRate` to avoid paying fees on what is effectively a trade.


## Economics

The Inter Protocol mechanism is envisioned as a major provider of liquidity. It may leave
its liquidity in the pool over the long term, and never or seldom collect earnings. Does
this affect prices or trading volumes adverselyj? (More liquidity is expected to provide
better prices for traders, so this would be a surprise.)

Other constant product markets have performed reasonably well through periods of high
volatillity. Is there any reason to expect the design variations we've introduced to have
trouble where others did not?

## Governance

The poolFee and protocolFee can be changed by governance. Can unauthorized parties
interfere with this? Is there any hazard here beyond the possibility that the holders of
this power might raise rates more than some users would be happy with?
