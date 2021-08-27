# Constant Product AMM

A simpler constant product automatic market maker based on our Ratio library and
charges two kinds of fees. The pool fee remains in the pool to reward the
liquidity providers. The protocol fee is extracted to fund community efforts.

This algorithm uses the x*y=k formula directly, without complicating it with
fees. Briefly, there are two pools of assets, whose values are kept roughly in
balance through the actions of arbitrageurs. At any time, a trader can come to
the pool and offer to deposit one of the two assets. They will receive an amount
of the complementary asset that will maintain the invariant that the product of
the pool values doesn't change. (Except that rounding is done in favor of the
pool.) The liquidity providers are rewarded by charging a fee. 

The user can specify a maximum amount they want to pay or a minimum amount they
want to receive. Unlike Uniswap, this approach will charge less than the user
offered or pay more than they asked for when appropriate. (By analogy, if a user
is willing to pay up to $20 when the price of soda is $3 per bottle, it would
give 6 bottles and only charge $18. Uniswap doesn't adjust the provided price,
so it charges $20. This matters whenever the values of the smallest unit of the
currencies are significantly different, which is common in defi.)

The rules that drive the design include

* When the user names an input (or output) price, they shouldn't pay more
  (or receive less) than they said.
* The pool fee is charged against the computed side of the price.
* The protocol fee is always charged in RUN.
* The fees should be calculated based on the pool's prices before a transaction.
* Computations are rounded in favor of the pool.

We start by estimating the exchange rate, and calculate fees based on that. Once
we know the fees, we add or subtract them directly to the amounts added to and
extracted from the pools to adhere to those rules.

## Calculating fees

In this table BLD represents any collateral. &Delta;X is always the amount contributed to the pool, and &Delta;Y is always
the amount extracted from the pool. 

|          | In (X) | Out (Y) | PoolFee | Protocol Fee | &Delta;X | &Delta;Y | pool Fee * |
|---------|-----|-----|--------|-----|-----|-----|-----|
| **RUN in** | RUN | BLD | BLD | RUN | sGive - PrFee | sGets | sGet - &Delta;Y
| **RUN out** | BLD | RUN | RUN | BLD | sGive | sGets + PrFee | &Delta;X - sGive
| **BLD in** | BLD | RUN | BLD | RUN | sGive | sGest + PrFee | &Delta;Y - sGet
| **BLD out** | RUN | BLD | RUN | BLD | sGive - PrFee | sGets | sGive - &Delta;X

(*) The Pool Fee remains in the pool, so its impact on the calculation is
subtle. When amountIn is specified, we add the poolFee to any minimum amountOut
from the user since the trade has to produce amoutOut plus the required fee in
order to be satisfactory. When amountOut is specified, we subtract the fee from any
amountIn max from the user since the fee has to come out of the user's deposit.

* When the amount of RUN provided is specified, (**RUN in**) we subtract
  the poolFee from the amount the user will give before using the reduced amount
  in the derivation of &Delta;Y from &Delta;X.
* When the amount of RUN being paid out is specified (**RUN out**), we add the
  poolFee to &Delta;X, which was calculated from the requested payout.
* When the amount of BLD to be paid in is specified (**BLD in**), the
  amount the user gets is computed by subtracting the poolFee from &Delta;Y
  which already had the protocolFee included.
* When the amount of BLD to be paid out is specified (**BLD out**), &Delta;X is
  computed from the required payout, and the poolFee is added to that to get the
  amount the user must pay.

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
