// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env-ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava'; // TODO ses-ava doesn't yet have test.todo
import '../../../../exported';

import { amountMath } from '@agoric/ertp';

import { makeAddCollateralInvitation } from '../../../../src/contracts/loan/addCollateral';
import { makeFakePriceAuthority } from '../../../../tools/fakePriceAuthority';
import buildManualTimer from '../../../../tools/manualTimer';

import {
  setupLoanUnitTest,
  makeSeatKit,
  performAddCollateral,
} from './helpers';
import { makeRatio } from '../../../../src/contractSupport';

test.todo('makeAddCollateralInvitation - test bad proposal');

test('makeAddCollateralInvitation', async t => {
  const { zcf, zoe, collateralKit, loanKit } = await setupLoanUnitTest();

  const collateral = amountMath.make(10n, collateralKit.brand);

  // Set up the collateral seat
  const { zcfSeat: collateralSeat } = await makeSeatKit(
    zcf,
    { give: { Collateral: collateral } },
    {
      Collateral: collateralKit.mint.mintPayment(collateral),
    },
  );

  const { zcfSeat: lenderSeat } = await zcf.makeEmptySeatKit();

  const timer = buildManualTimer(console.log);

  const priceAuthority = makeFakePriceAuthority({
    priceList: [],
    timer,
    actualBrandIn: collateralKit.brand,
    actualBrandOut: loanKit.brand,
  });

  const autoswapInstance = {};
  const getDebt = () => amountMath.make(100n, loanKit.brand);

  const config = {
    collateralSeat,
    lenderSeat,
    autoswapInstance,
    priceAuthority,
    getDebt,
    mmr: makeRatio(150n, loanKit.brand),
    loanBrand: loanKit.brand,
  };
  const addCollateralInvitation = makeAddCollateralInvitation(zcf, config);

  const addedAmount = amountMath.make(3n, collateralKit.brand);

  await performAddCollateral(
    t,
    zoe,
    collateralKit,
    loanKit,
    addCollateralInvitation,
    addedAmount,
  );

  // Ensure the collSeat gets the added collateral

  t.deepEqual(collateralSeat.getCurrentAllocation(), {
    Collateral: amountMath.add(collateral, addedAmount),
  });
});
