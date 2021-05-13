// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { AmountMath } from '@agoric/ertp';

import { wrapZCF } from '../../../../src/contractSupport';
import { assertConstantProduct } from '../../../../src/contracts/multipoolAutoswap/constantProduct';
import { setupZCFTest } from '../../zcf/setupZcfTest';

test('constantProduct invariant', async t => {
  const { zcf } = await setupZCFTest();

  const wrappedZCF = wrapZCF(zcf, assertConstantProduct);

  const { zcfSeat: poolSeat } = wrappedZCF.makeEmptySeatKit();
  const { zcfSeat: swapSeat } = wrappedZCF.makeEmptySeatKit();

  // allocate some secondary and central to the poolSeat
  const centralMint = await wrappedZCF.makeZCFMint('Central');
  const { brand: centralBrand } = centralMint.getIssuerRecord();
  const secondaryMint = await wrappedZCF.makeZCFMint('Secondary');
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
    () =>
      wrappedZCF.reallocate(
        poolSeat.stage({
          Central: AmountMath.make(centralBrand, 0n),
          Secondary: AmountMath.make(secondaryBrand, 0n),
        }),
        swapSeat.stage({
          In: poolSeatAllocation.Central,
          Out: poolSeatAllocation.Secondary,
        }),
      ),
    {
      message:
        'the product of the pool tokens must not decrease as the result of a trade. "[1000000000000n]" decreased to "[0n]"',
    },
  );
});
