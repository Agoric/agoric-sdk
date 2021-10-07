# Constant Product AMM

A constant product automatic market maker based on our Ratio library. It charges
two kinds of fees: a pool fee remains in the pool to reward the liquidity
providers and a protocol fee is extracted to fund the economy. The external
entry point is a call to `pricesForStatedInput()` or `pricesForStatedOutput()`.

This algorithm uses the x*y=k formula directly, without fees. Briefly, there are
two kinds of assets, whose values are kept roughly in balance through the
actions of arbitrageurs. At any time a trader can trade with the pool by
offering to deposit one of the two assets. They will receive an amount
of the complementary asset that will maintain the invariant that the product of
the balances doesn't decrease. (Rounding is done in favor of the
pool.) A fee is charged on the swap to reward the liquidity providers.

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
* The pool fee is charged against the side not specified by the user (the
  "computed side").
* The protocol fee is always charged in RUN.
* The fees should be calculated based on the pool balances before a transaction.
* Computations are rounded in favor of the pool.

We start by estimating the exchange rate, and calculate fees based on that. Once
we know the fees, we add or subtract them directly to the amounts added to and
extracted from the pools to adhere to those rules.

## Calculating fees

In these tables BLD represents any collateral. The user can specify how much
they want or how much they're willing to pay. We'll call the value they
specified **sGive** or **sGet** and bold it. We'll always refer to the currency
being added as X (regardless of whether it's what they pay or what they receive)
and the currency the user gets as Y. This table shows which brands the
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
price case using the constant product formulas. We call these estimates
&delta;X, and &delta;Y. The fees are based on &delta;X, and &delta;Y. &rho; is
the poolFee (e.g. .003).

The pool fee will be &rho; times whichever of &delta;X and &delta;Y was
calculated. The protocol fee will be &rho; * &delta;X when RUN is paid in, and
&rho; * &delta;Y when BLD is paid in.

|          | &delta;X | &delta;Y | PoolFee | Protocol Fee |
|---------|-----|-----|--------|-----|
| **RUN in**  | **sGive** | calc | &rho; &times; &delta;Y | &rho; &times; **sGive** (= &rho; &times; &delta;X) |
| **RUN out** | calc  | **sGet** | &rho; &times; &delta;Y | &rho; &times; **sGet** (= &rho; &times; &delta;Y) |
| **BLD in**  | **sGive**  | calc | &rho; &times; &delta;X | &rho; &times; &delta;Y |
| **BLD out** | calc | **sGet** | &rho; &times; &delta;X | &rho; &times; &delta;X |

In rows 1 and 3, **sGive** was specified and sGet will be calculated. In rows 2
and 4, **sGet** was specified and sGive will be calculated. Once we know the
fees, we can add or subtract the fees and calculate the pool changes.

Notice that the ProtocolFee always affects the inputs to the constant product
calculation (because it is collected outside the pool). The PoolFee is visible
in the formulas in this table when the input to the calculation is in RUN.

|          | input estimate | output estimate |
|---------|-----|-----|
| **RUN in** | **sGive** - ProtocolFee |  |
| **RUN out** |  | **sGet** + ProtocolFee + PoolFee |
| **BLD in** | **sGive** - ProtocolFee - PoolFee |  |
| **BLD out** |  | **sGet** + ProtocolFee |

We use the estimate of the amount in or out to calculate improved values of
&Delta;X and &Delta;Y. These values tell us how much the trader will pay, the
changes in pool balances, and what the trader will receive. As before, &Delta;X
reflects a balance that will be growing, and &Delta;Y one that will be
shrinking. If **sGive** is known, we subtract fees to get &Delta;X and calculate
&Delta;Y. If **sGet** is known, we add fees to get &Delta;Y and calculate
&Delta;X. &Delta;Y and &Delta;X are the values that maintain the constant
product invariant. The amount paid and received by the trader and changes to the
pool are calculated relative to &Delta;X and &Delta;Y so that the pool grows by
the poolFee and the protocolFee can be paid from the proceeds.

|          | xIncr | yDecr | pay In | pay Out |
|---------|-----|-----|-----|-----|
| **RUN in**  | &Delta;X | &Delta;Y - PoolFee | &Delta;X + protocolFee | &Delta;Y - PoolFee |
| **RUN out**  | &Delta;X | &Delta;Y - PoolFee | &Delta;X + protocolFee | &Delta;Y - PoolFee |
| **BLD in**  | &Delta;X + PoolFee | &Delta;Y | &Delta;X + PoolFee + ProtocolFee | &Delta;Y |
| **BLD out**  | &Delta;X + PoolFee | &Delta;Y | &Delta;X + PoolFee + ProtocolFee | &Delta;Y |

In the two right columns the protocolFee is either added to the amount the
trader pays, or subtracted from the proceeds. The poolFee does the same on the
left side, and it is either added to the amount deposited in the pool (xIncr)
or deducted from the amout removed from the pool (yDecr).

## Example

For example, let's say the pool has 40,000,000 RUN and 3,000,000 BLD. Alice
requests a swapIn with inputAmount of 30,000 RUN, and outputAmount of 2000 BLD.
(SwapIn means the inputValue is the basis of the computation, while outputAmount
is treated as a minimum). To make the numbers concrete, we'll say the pool fee
is 25 Basis Points, and the protocol fee is 5 Basis Points.

The first step is to compute the trade that would take place with no fees. 30K
will be added to 40M RUN. To keep the product just above 120MM, the BLD will be
reduced to 2,997,752.

```
40,030,000 * 2,997,752 > 40,000,000 * 3,000,000 > 40,030,000 * 2,997,751
   120000012560000     >    120000000000000     >   119999972530000
```

But we get an even tighter bound by reducing the amount Alice has to spend

```
40,029,996 * 2,997,752 > 40,000,000 * 3,000,000 > 40,029,995 * 2,997,752
    120000000568992    >    120000000000000     >   119999997571240
```

The initial price estimate is that 29,996 RUN would get 2248 BLD in a no-fee
pool. We base fees on this estimate, so the **protocol Fee will be 15 RUN**
(always in RUN) and the **pool fee will be 6 BLD**.  The pool fee is calculated
on the output for `swapIn` and the input for `swapOut`.

Now we calculate the actual &Delta;X and &Delta;Y, since the fees affect the
size of the changes to the pool. From the first row of the third table we see
that the calculation starts from &Delta;X of
`sGive - ProtocolFee (i.e. 30,000 - 15 = 29,985)`

```
40,029,985 * 2,997,7752 > 40,000,000 * 3,000,000 > 40,029,985 * 2,997,753
```

and re-checking how much is required to produce 2,997,753, we get

```
40_029_982 * 2,997,753 > 40,000,000 * 3,000,000 > 40,029,983 * 2,997,753
```

**&Delta;X is 29,983, and &Delta;Y is 2247**.

 * Alice pays &Delta;X + protocolFee, which is 29,983 + 15  (29998 RUN)
 * Alice will receive &Delta;Y - PoolFee which is 2247 - 6  (2241 BLD)
 * The RUN in the pool will increase by &Delta;X   (29983 RUN)
 * The BLD in the pool will decrease by &Delta;Y   (2247 BLD)

The Pool grew by 6 BLD more than was required to maintain the constant product
invariant. 15 RUN were extracted for the protocol fee.

