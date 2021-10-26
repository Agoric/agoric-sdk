// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';
import {
  getInputPrice,
  getOutputPrice,
  natSafeMath,
  makeRatio,
  multiplyBy,
} from '../../../../src/contractSupport/index.js';
import { setup } from '../../setupBasicMints.js';
import { makeGetCurrentPrice } from '../../../../src/contracts/newSwap/getCurrentPrice.js';
import {
  outputFromInputPrice,
  priceFromTargetOutput,
} from '../../../autoswapJig.js';

const { add, subtract, floorDivide, multiply } = natSafeMath;
const BASIS_POINTS = 10000n;

function makeFakePool(initCentral, initSecondary) {
  let centralBalance = initCentral.value;
  let secondaryBalance = initSecondary.value;

  const pool = {
    getPriceGivenAvailableInput: (inputAmount, outputBrand, feeBP = 30n) => {
      const [inputReserve, outputReserve] =
        outputBrand === initCentral.brand
          ? [secondaryBalance, centralBalance]
          : [centralBalance, secondaryBalance];

      const valueOut = getInputPrice(
        inputAmount.value,
        inputReserve,
        outputReserve,
        feeBP,
      );
      const valueIn = getOutputPrice(
        valueOut,
        inputReserve,
        outputReserve,
        feeBP,
      );
      return {
        amountOut: AmountMath.make(outputBrand, valueOut),
        amountIn: AmountMath.make(inputAmount.brand, valueIn),
      };
    },

    getPriceGivenRequiredOutput: (inputBrand, outputAmount, feeBP = 30n) => {
      const [inputReserve, outputReserve] =
        inputBrand === initSecondary.brand
          ? [secondaryBalance, centralBalance]
          : [centralBalance, secondaryBalance];
      const valueIn = getOutputPrice(
        outputAmount.value,
        inputReserve,
        outputReserve,
        feeBP,
      );
      const valueOut = getInputPrice(
        valueIn,
        inputReserve,
        outputReserve,
        feeBP,
      );
      return {
        amountOut: AmountMath.make(outputAmount.brand, valueOut),
        amountIn: AmountMath.make(inputBrand, valueIn),
      };
    },
  };

  const poolAdmin = {
    toCentral: (centralChange, secondaryChange) => {
      centralBalance = add(centralBalance, centralChange);
      secondaryBalance = subtract(secondaryBalance, secondaryChange);
    },
    toSecondary: (centralChange, secondaryChange) => {
      centralBalance = subtract(centralBalance, centralChange);
      secondaryBalance = add(secondaryBalance, secondaryChange);
    },
  };

  return { pool, poolAdmin };
}

function setupPricer(initialMoola, initialBucks, initialSimoleans = 100n) {
  const { bucks, moola, simoleans, brands } = setup();
  const moolaBrand = brands.get('moola');
  const bucksBrand = brands.get('bucks');
  const simoleansBrand = brands.get('simoleans');

  const { pool: bucksPool } = makeFakePool(
    moola(initialMoola),
    bucks(initialBucks),
  );
  // might be nice to specify the amount of moola in the two pools separately
  const { pool: simoleanPool } = makeFakePool(
    moola(initialMoola),
    simoleans(initialSimoleans),
  );

  function getPool(brand) {
    switch (brand) {
      case bucksBrand:
        return bucksPool;
      case simoleansBrand:
        return simoleanPool;
      default:
        throw Error('Pool not found');
    }
  }

  const pricer = makeGetCurrentPrice(
    b => b !== moolaBrand,
    b => b === moolaBrand,
    getPool,
    moolaBrand,
    24n,
    6n,
  );

  return {
    bucks,
    moola,
    simoleans,
    bucksBrand,
    moolaBrand,
    simoleansBrand,
    getPool,
    pricer,
  };
}

function protocolFee(input) {
  return floorDivide(multiply(input, 6n), BASIS_POINTS);
}

test('newSwap getPriceGivenAvailableInput specify central', async t => {
  const initMoola = 800000n;
  const initBucks = 300000n;
  const { bucks, moola, moolaBrand, bucksBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
  );

  const input = 10000n;
  const feeOverOnePlusFee = makeRatio(6n, moolaBrand, add(BASIS_POINTS, 6n));
  const pFee = multiplyBy(moola(input), feeOverOnePlusFee);

  const valueOut = outputFromInputPrice(
    initMoola,
    initBucks,
    input - pFee.value,
    24n,
  );
  const valueIn = priceFromTargetOutput(valueOut, initBucks, initMoola, 24n);
  t.deepEqual(pricer.getPriceGivenAvailableInput(moola(input), bucksBrand), {
    amountIn: moola(valueIn + pFee.value),
    amountOut: bucks(valueOut),
    protocolFee: moola(pFee.value),
  });
  t.truthy(
    (initMoola - valueOut) * (initBucks + valueIn) > initBucks * initMoola,
  );
});

test('newSwap getPriceGivenAvailableInput secondary', async t => {
  const initMoola = 800000n;
  const initBucks = 500000n;
  const { bucks, moola, moolaBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
  );

  const input = 10000n;
  const valueOut = outputFromInputPrice(initBucks, initMoola, input, 24n);
  const pFee = protocolFee(valueOut);
  const valueIn = priceFromTargetOutput(valueOut, initMoola, initBucks, 24n);
  t.deepEqual(pricer.getPriceGivenAvailableInput(bucks(input), moolaBrand), {
    amountIn: bucks(valueIn),
    amountOut: moola(valueOut - pFee),
    protocolFee: moola(pFee),
  });
  t.truthy(
    (initMoola - valueOut) * (initBucks + valueIn) > initBucks * initMoola,
  );
});

test('newSwap getPriceGivenRequiredOutput specify central', async t => {
  const initMoola = 70000000n;
  const initBucks = 50000000n;
  const poolFee = 24n;
  const protocolFeeBP = 6n;

  const { bucks, moola, moolaBrand, bucksBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
  );

  const output = 100000n;
  const pFee = multiplyBy(
    moola(output),
    makeRatio(protocolFeeBP, moolaBrand, subtract(BASIS_POINTS, protocolFeeBP)),
  );
  const poolChange = output + pFee.value;
  const valueIn = priceFromTargetOutput(
    poolChange,
    initMoola,
    initBucks,
    poolFee,
  );
  const valueOut = outputFromInputPrice(initBucks, initMoola, valueIn, poolFee);

  t.deepEqual(pricer.getPriceGivenRequiredOutput(bucksBrand, moola(output)), {
    amountIn: bucks(valueIn),
    amountOut: AmountMath.subtract(moola(valueOut), pFee),
    protocolFee: pFee,
  });
  t.truthy(
    (initMoola - valueOut) * (initBucks + valueIn + pFee.value) >
      initBucks * initMoola,
  );
});

test('newSwap getPriceGivenRequiredOutput specify secondary', async t => {
  const initMoola = 700000n;
  const initBucks = 500000n;
  const { bucks, moola, moolaBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
  );

  const output = 10000n;
  const valueIn = priceFromTargetOutput(output, initBucks, initMoola, 24n);
  const valueOut = outputFromInputPrice(initMoola, initBucks, valueIn, 24n);
  const pFee = protocolFee(valueIn);
  t.deepEqual(pricer.getPriceGivenRequiredOutput(moolaBrand, bucks(output)), {
    amountIn: moola(valueIn + pFee),
    amountOut: bucks(valueOut),
    protocolFee: moola(pFee),
  });
  t.truthy(
    (initMoola - valueOut) * (initBucks + valueIn + pFee) >
      initBucks * initMoola,
  );
});

test('newSwap getPriceGivenAvailableInput twoPools', async t => {
  const initMoola = 800000n;
  const initBucks = 500000n;
  const initSimoleans = 300000n;
  const { bucks, moola, simoleans, simoleansBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
    initSimoleans,
  );

  // get price given input from simoleans to bucks through moola, presuming
  // there will be no price improvement
  const input = 10000n;
  const moolaOut = outputFromInputPrice(initBucks, initMoola, input, 12n);
  const feeOut = floorDivide(multiply(moolaOut, 6), BASIS_POINTS);
  const simOut = outputFromInputPrice(
    initMoola,
    initSimoleans,
    moolaOut - feeOut,
    12n,
  );
  t.deepEqual(
    pricer.getPriceGivenAvailableInput(bucks(input), simoleansBrand),
    {
      amountIn: bucks(input),
      amountOut: simoleans(simOut),
      protocolFee: moola(feeOut),
      centralAmount: moola(moolaOut),
    },
  );
});

test('newSwap getPriceGivenAvailableInput twoPools large fee', async t => {
  const initMoola = 80000000n;
  const initBucks = 50000000n;
  const initSimoleans = 30000000n;
  const { bucks, simoleansBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
    initSimoleans,
  );
  // get price given input from simoleans to bucks through moola
  const input = 10000000n;

  const quote = pricer.getPriceGivenAvailableInput(
    bucks(input),
    simoleansBrand,
  );
  t.truthy(AmountMath.isGTE(bucks(input), quote.amountIn));
  t.deepEqual(
    quote.protocolFee.value,
    protocolFee(
      AmountMath.subtract(quote.centralAmount, quote.protocolFee).value,
    ),
  );
  t.is(
    quote.centralAmount.value,
    outputFromInputPrice(initBucks, initMoola, quote.amountIn.value, 12n),
  );
  t.is(
    quote.amountOut.value,
    outputFromInputPrice(
      initMoola,
      initSimoleans,
      AmountMath.subtract(quote.centralAmount, quote.protocolFee).value,
      12n,
    ),
  );
});

test('newSwap getPriceGivenRequiredOutput twoPools', async t => {
  const initMoola = 800000n;
  const initBucks = 500000n;
  const initSimoleans = 300000n;
  const { bucks, moola, simoleans, simoleansBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
    initSimoleans,
  );

  // get price given desired output from simoleans to bucks through moola,
  // choosing 10001 so there will be no price improvement
  const output = 10001n;
  const moolaIn = priceFromTargetOutput(output, initBucks, initMoola, 12n);
  const fee = floorDivide(multiply(moolaIn, 6), BASIS_POINTS);
  const simIn = priceFromTargetOutput(
    moolaIn + fee,
    initMoola,
    initSimoleans,
    12n,
  );
  t.deepEqual(
    pricer.getPriceGivenRequiredOutput(simoleansBrand, bucks(output)),
    {
      amountIn: simoleans(simIn),
      amountOut: bucks(output),
      protocolFee: moola(fee),
      centralAmount: moola(moolaIn),
    },
  );
});

test('newSwap getPriceGivenOutput central extreme', async t => {
  const initMoola = 700000n;
  const initBucks = 500000n;
  const poolFee = 24n;
  const protocolFeeBP = 6n;
  const { bucks, moola, moolaBrand, bucksBrand, pricer } = setupPricer(
    initMoola,
    initBucks,
  );

  const output = 690000n;
  const pFee = multiplyBy(
    moola(output),
    makeRatio(protocolFeeBP, moolaBrand, subtract(BASIS_POINTS, protocolFeeBP)),
  );

  const poolChange = output + pFee.value;
  const valueIn = priceFromTargetOutput(
    poolChange,
    initMoola,
    initBucks,
    poolFee,
  );
  const valueOut = outputFromInputPrice(initBucks, initMoola, valueIn, poolFee);

  t.deepEqual(pricer.getPriceGivenRequiredOutput(bucksBrand, moola(output)), {
    amountIn: bucks(valueIn),
    amountOut: AmountMath.subtract(moola(valueOut), pFee),
    protocolFee: pFee,
  });

  t.truthy(
    (initMoola - valueOut) * (initBucks + valueIn + pFee.value) >
      initBucks * initMoola,
  );
});

test('newSwap getPriceGivenInput secondary extreme', async t => {
  const moolaPool = 800000n;
  const bucksPool = 500000n;
  const { bucks, moola, moolaBrand, pricer } = setupPricer(
    moolaPool,
    bucksPool,
  );

  const input = 690000n;
  const valueOut = outputFromInputPrice(bucksPool, moolaPool, input, 24n);
  const pFee = protocolFee(valueOut);
  const valueIn = priceFromTargetOutput(valueOut, moolaPool, bucksPool, 24n);
  t.deepEqual(pricer.getPriceGivenAvailableInput(bucks(input), moolaBrand), {
    amountIn: bucks(valueIn),
    amountOut: moola(valueOut - pFee),
    protocolFee: moola(pFee),
  });
  t.truthy(
    (moolaPool - valueOut) * (bucksPool + valueIn) > bucksPool * moolaPool,
  );
});
