# Constant Product AMM

A constant product automatic market maker based on our Ratio library. It charges
two kinds of fees: a pool fee remains in the pool to reward the liquidity
providers and a protocol fee is extracted to fund the economy.

This algorithm uses the x*y=k formula directly, without fees. Briefly, there are
two kinds of assets, whose values are kept roughly in balance through the
actions of arbitrageurs. At any time, a trader can come to the pool and offer to
deposit one of the two assets. They will receive an amount
of the complementary asset that will maintain the invariant that the product of
the balances doesn't change. (Except that rounding is done in favor of the
pool.) The liquidity providers are rewarded by charging a fee. 

The user can specify a maximum amount they want to pay or a minimum amount they
want to receive. Unlike Uniswap, this approach will charge less than the user
offered or pay more than they asked for when appropriate. By analogy, if a user
is willing to pay up to $20 when the price of soda is $3 per bottle, it would
give 6 bottles and only charge $18. Uniswap doesn't adjust the provided price,
so it charges $20. This matters whenever the values of the smallest unit of the
currencies are significantly different, which is common in DeFi. (We refer to
these as "improved" prices.)

The rules that drive the design include

* When the user names an input (or output) price, they shouldn't pay more
  (or receive less) than they said.
* The pool fee is charged against the computed side of the price.
* The protocol fee is always charged in RUN.
* The fees should be calculated based on the pool balances before a transaction.
* Computations are rounded in favor of the pool.

We start by estimating the exchange rate, and calculate fees based on that. Once
we know the fees, we add or subtract them directly to the amounts added to and
extracted from the pools to adhere to those rules.

## Calculating fees

In these tables BLD represents any collateral. The user can specify how much
they want or how much they're willing to pay. We'll call the value they
specified **sGive** or **sGet** and bold it. This table shows which brands the
amounts each have, as well as what is computed vs. given. The PoolFee is
computed based on the calculated amount (BLD in rows 1 and 2; RUN in rows 3 and
4). The Protocol fee is always in RUN.

|          | In (X) | Out (Y) | PoolFee | Protocol Fee | Specified | Computed |
|---------|-----|-----|--------|-----|------|-----|
| **RUN in** | RUN | BLD | BLD | RUN | **sGive** | sGet |
| **RUN out** | BLD | RUN | BLD | RUN | **sGet** | sGive |
| **BLD in** | BLD | RUN | RUN | RUN | **sGive** | sGet |
| **BLD out** | RUN | BLD | RUN | RUN | **sGet** | sGive |

We'll estimate how much the pool balances would change in the no-fee, improved
price case using the constant product formulas. These estimates are &delta;X,
and &delta;Y. The fees are based on &delta;X, and &delta;Y. &rho; is the poolFee
(e.g. .003).

The pool fee will be &rho; times whichever of &delta;X and &delta;Y was
calculated. The protocol fee will be &rho; * &delta;X when RUN is paid in, and
&rho; * &delta;Y when BLD is paid in.

|          | &delta;X | &delta;Y | PoolFee | Protocol Fee |
|---------|-----|-----|--------|-----|
| **RUN in**  | **sGive** | calc | &rho; &times; &delta;Y | &rho; &times; **sGive** (= &rho; &times; &delta;X) |
| **RUN out** | calc  | **sGet** | &rho; &times; &delta;X | &rho; &times; **sGet** (= &rho; &times; &delta;Y) |
| **BLD in**  | **sGive**  | calc | &rho; &times; &delta;Y | &rho; &times; &delta;Y |
| **BLD out** | calc | **sGet** | &rho; &times; &delta;X | &rho; &times; &delta;X |

In rows 1 and 3, **sGive** was specified and sGet will be calculated. In rows 2
and 4, **sGet** was specified and sGive will be calculated. Once we know the
fees, we can add or subtract the fees and calculate the pool changes.

&Delta;X is the incrementing side of the constant product calculation, and
&Delta;Y is the decrementing side. If **sGive** is known, we subtract fees to
get &Delta;X and calculate &Delta;Y. If **sGet** is known, we add fees to
get &Delta;Y and calculate &Delta;X. &Delta;Y and &Delta;X are the values
that maintain the constant product invariant.

Notice that the ProtocolFee always affects the inputs to the constant product
calculation (because it is collected outside the pool). The PoolFee is visible
in the formulas in this table when the input to the calculation is in RUN.

|          | &Delta;X | &Delta;Y |
|---------|-----|-----|
| **RUN in** | **sGive** - ProtocolFee | calc |
| **RUN out** | calc | **sGet** + ProtocolFee + PoolFee |
| **BLD in** | **sGive** - ProtocolFee - PoolFee | calc |
| **BLD out** | calc | **sGet** + ProtocolFee |

Now we can compute the change in the pool balances, and the amount the trader
would pay and receive.

|          | xIncr | yDecr | pay In | pay Out |
|---------|-----|-----|-----|-----|
| **RUN in**  | &Delta;X | &Delta;Y - PoolFee | &Delta;X + protocolFee | &Delta;Y - PoolFee |
| **RUN out** | &Delta;X | &Delta;Y - PoolFee | &Delta;X | &Delta;Y - PoolFee - ProtocolFee |
| **BLD in**  | &Delta;X + PoolFee | &Delta;Y | &Delta;X + PoolFee | &Delta;Y - ProtocolFee |
| **BLD out** | &Delta;X + PoolFee | &Delta;Y | &Delta;X + PoolFee + ProtocolFee | &Delta;Y |

In the two right columns the protocolFee is either added to the amount the
trader pays, or subtracted from the proceeds. The poolFee does the same on the
trader side, and it is either added to the amount deposited in the pool (xIncr)
or deducted from the amout removed from the pool (yDecr).

## Example

For example, if the pools were at 40000 RUN and 3000 BLD and the user's offer
specifies that they want to buy BLD and are willing to spend up to 300 RUN, the
fees will be 1 RUN and 1 BLD because the amounts are low for expository
purposes. Since the user specified the input price, we calculate the output
using the constant product formula for &Delta;Y. The protocol fee is always
charged in RUN, so the pool will only gain 299 from the user's 300 RUN.

(3000 * 299) / (40000n + 299) = 22

Notice that 23 gives a product just below x*y, and 22 just above
(3000n + 23n)  * (40000n + 299n) < 3000n * 40000n
3000n * 40000n < (3000n + 22n)  * (40000n + 299n)

We then calculate how much the user should actually pay for that using the
deltaX formula, which tells us that the pool would be able to maintain its
invariants if it charged 296, so the user won't have to pay the whole 300 that
was offered. We will add 1

(40000n * 22n) / (3000n - 22n) = 296

This time 295 and 296 bracket the required value.
(3000n - 22n)  * (40000n + 295n) < 3000n * 40000n
3000n * 40000n < (3000n - 22n)  * (40000n + 296n)

The pool fee will be subtracted from the proceeds before paying the user, so the
result is that the user pays 297 RUN and gets 21 BLD. The pool's K changes from
120M to 120041784n reflecting the pool fee, and 1 BLD is paid to the protocol
fee.

A withdrawal from the pool of 22 build would have  maintained the invariants;
we withdrew 21 instead

(3000n - 21n)  * (40000n + 296n)
