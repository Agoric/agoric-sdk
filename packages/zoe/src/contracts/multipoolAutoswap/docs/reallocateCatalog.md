# Reallocation in Multipool Autoswap

This an analysis looking for potential rights conservation violations.
There are 6 calls to the helper `trade` which internally calls
`zcf.reallocate` and 2 calls to `reallocate` directly.

Here are some principles that were discovered:

**When `trade` is used and only `gains` are specified, rights are
  guaranteed to be conserved.** This is easily confirmed by a glance.

**When `trade` is used and `gains` and `losses` are specified, and
these values are the same variables, rights are guaranteed to be
conserved.** This is pretty easy to confirm with a quick look.

## `Trade` calls

Trade operates over two `SeatGainsLossesRecord`. These records have
the structure `{ seat, gains: AmountMathKeyword, losses:
AmountMathKeyword }`. Trade calculates the new allocations and tries
to reallocate.

### addLiquidityActual: pool.js line 66

```js
trade(
  zcf,
  {
    seat: poolSeat,
    gains: {
      Central: zcfSeat.getCurrentAllocation().Central,
      Secondary: secondaryAmount,
    },
  },
  {
    seat: zcfSeat,
    gains: { Liquidity: liquidityAmountOut },
  },
);
```

This specifies the gains only. The poolSeat gains all Central from the
zcfSeat, and a specific amount of Secondary. There are only two seats.
Because the losses are not specified, `trade` defaults to treating the
losses as the gains to the other seat, so rights conservation should
hold here automatically, regardless of how much is gained.

### removeLiquidity: pool.js line 256

```js
trade(
  zcf,
  {
    seat: poolSeat,
    gains: { Liquidity: liquidityIn },
  },
  {
    seat: userSeat,
    gains: {
      Central: centralTokenAmountOut,
      Secondary: tokenKeywordAmountOut,
    },
  },
);
```

Only the gains are specified here too. So I believe rights
conservation holds automatically regardless of the calculations for
these values.

### swapIn - central to secondary - swap.js 57

```js
trade(
  zcf,
  {
    seat: pool.getPoolSeat(),
    gains: { Central: reducedAmountIn },
    losses: { Secondary: amountOut },
  },
  {
    seat,
    gains: { Out: amountOut },
    losses: { In: reducedAmountIn },
  },
);
```
Here the keywords are different, so we have to specify the losses. A
rights conservation error could occur if the gains to one seat don't
match the losses to the other seat. But here, we use the same exact
values for the gains and losses: e.g. `poolSeat.gains.Central =
reducedAmountIn`, and `seat.losses.In = reducedAmountIn`.

### swapIn - secondary to central - swap.js 81

```js
trade(
  zcf,
  {
    seat: pool.getPoolSeat(),
    gains: { Secondary: reducedAmountIn },
    losses: { Central: amountOut },
  },
  {
    seat,
    gains: { Out: amountOut },
    losses: { In: reducedAmountIn },
  },
);
```

Same values for the gains and losses.


### swapOut - central to secondary - swap.js 177

```js
trade(
  zcf,
  {
    seat: pool.getPoolSeat(),
    gains: { Secondary: amountIn },
    losses: { Central: improvedAmountOut },
  },
  {
    seat,
    gains: { Out: improvedAmountOut },
    losses: { In: amountIn },
  },
);
```

Same values for gains and losses.

### swapOut - secondary to central - swap.js 200

```js
trade(
  zcf,
  {
    seat: pool.getPoolSeat(),
    gains: { Central: amountIn },
    losses: { Secondary: improvedAmountOut },
  },
  {
    seat,
    gains: { Out: improvedAmountOut },
    losses: { In: amountIn },
  },
);
```
Same values for the gains and losses.

## `Reallocate` calls

## swapIn - secondary to secondary - swap.js 138

A three seat `reallocate` over user's `zcfSeat`, the `poolInSeat`, and the
`poolOutSeat`. 

The starting amounts, organized in arrays by brand: 

```
secondary1: [zcfSeat.amountIn, poolInSeat.oldSecondaryAmount]
central: [poolInSeat.oldCentralAmount, poolOutSeat.oldCentralAmount]
secondary2: [poolOutSeat.oldSecondaryAmount, zcfSeat.amountOut=0] 
```

The ending amounts, organized in arrays by brand, with the deltas:

```
secondary1: [zcfSeat.amountIn - reducedAmountIn, poolInSeat.oldSecondaryAmount + reducedAmountIn]
central: [poolInSeat.oldCentralAmount - reducedCentralAmount, poolOutSeat.oldCentralAmount + reducedCentralAmount]
secondary2: [poolOutSeat.oldSecondaryAmount - amountOut, zcfSeat.amountOut + amountOut] 
```

This will not cause a rights conservation error, because the same
amounts are being added and subtracted

```
const {
  amountIn: reducedAmountIn,
  amountOut,
  centralAmount: reducedCentralAmount,
} = getPriceGivenAvailableInput(amountIn, brandOut);

const brandInPool = getPool(brandIn);
const brandOutPool = getPool(brandOut);

const seatStaging = seat.stage(
  harden({
    In: amountMath.subtract(amountIn, reducedAmountIn),
    Out: amountOut,
  }),
);

const poolBrandInStaging = brandInPool.stageSeat({
  Secondary: amountMath.add(
    brandInPool.getSecondaryAmount(),
    reducedAmountIn,
  ),
  Central: amountMath.subtract(
    brandInPool.getCentralAmount(),
    reducedCentralAmount,
  ),
});

const poolBrandOutStaging = brandOutPool.stageSeat({
  Central: amountMath.add(
    brandOutPool.getCentralAmount(),
    reducedCentralAmount,
  ),
  Secondary: amountMath.subtract(
    brandOutPool.getSecondaryAmount(),
    amountOut,
  ),
});

zcf.reallocate(poolBrandInStaging, poolBrandOutStaging, seatStaging);
```

## swapOut - secondary to secondary - swap.js 253

This code has rights conservation bugs, filed in https://github.com/Agoric/agoric-sdk/issues/3071

```
const {
  amountIn,
  amountOut: improvedAmountOut,
  // TODO: determine whether centralAmount will always exist
  // @ts-ignore If has Central, should not be typed as PriceAmountPair
  centralAmount: improvedCentralAmount,
} = getPriceGivenRequiredOutput(brandIn, amountOut);
const brandInPool = getPool(brandIn);
const brandOutPool = getPool(brandOut);

const seatStaging = seat.stage(
  harden({
    In: amountIn,
    Out: amountMath.subtract(improvedAmountOut, amountOut),
  }),
);

const poolBrandInStaging = brandInPool.stageSeat({
  Secondary: amountMath.add(brandInPool.getSecondaryAmount(), amountIn),
  Central: amountMath.subtract(
    brandInPool.getCentralAmount(),
    improvedCentralAmount,
  ),
});

const poolBrandOutStaging = brandOutPool.stageSeat({
  Central: amountMath.add(
    brandOutPool.getCentralAmount(),
    improvedCentralAmount,
  ),
  Secondary: amountMath.subtract(
    brandOutPool.getSecondaryAmount(),
    improvedAmountOut,
  ),
});

zcf.reallocate(poolBrandInStaging, poolBrandOutStaging, seatStaging);
```