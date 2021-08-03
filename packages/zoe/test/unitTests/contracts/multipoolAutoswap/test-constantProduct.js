// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { AmountMath } from '@agoric/ertp';

import { checkZCF } from '../../../../src/contractSupport.js';
import { assertConstantProduct } from '../../../../src/contracts/multipoolAutoswap/constantProduct.js';
import { setupZCFTest } from '../../zcf/setupZcfTest.js';

test('constantProduct invariant', async t => {
  const { zcf } = await setupZCFTest();

  const checkedZCF = checkZCF(zcf, assertConstantProduct);

  const { zcfSeat: poolSeat } = checkedZCF.makeEmptySeatKit();
  const { zcfSeat: swapSeat } = checkedZCF.makeEmptySeatKit();

  // allocate some secondary and central to the poolSeat
  const centralMint = await checkedZCF.makeZCFMint('Central');
  const { brand: centralBrand } = centralMint.getIssuerRecord();
  const secondaryMint = await checkedZCF.makeZCFMint('Secondary');
  const { brand: secondaryBrand } = secondaryMint.getIssuerRecord();
  centralMint.mintGains(
    { Central: AmountMath.make(centralBrand, 10n ** 6n) },
    poolSeat,
  );
  secondaryMint.mintGains(
    { Secondary: AmountMath.make(secondaryBrand, 10n ** 6n) },
    poolSeat,
  );

  const poolSeatAllocation = poolSeat.getCurrentAllocation();
  t.deepEqual(poolSeatAllocation, {
    Central: AmountMath.make(centralBrand, 10n ** 6n),
    Secondary: AmountMath.make(secondaryBrand, 10n ** 6n),
  });

  // const oldK =
  //   poolSeatAllocation.Secondary.value * poolSeatAllocation.Central.value;

  // const newK = 0;

  // Let's give the swap user all the tokens and take
  // nothing, a clear violation of the constant product
  t.throws(
    () => {
      poolSeat.decrementBy(poolSeatAllocation);
      swapSeat.incrementBy({
        In: poolSeatAllocation.Central,
        Out: poolSeatAllocation.Secondary,
      });
      checkedZCF.reallocate(poolSeat, swapSeat);
    },
    {
      message:
        'the product of the pool tokens must not decrease as the result of a trade. "[1000000000000n]" decreased to "[0n]"',
    },
  );
});
