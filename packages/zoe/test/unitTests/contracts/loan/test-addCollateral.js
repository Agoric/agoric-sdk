// @ts-nocheck
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava'; // TODO ses-ava doesn't yet have test.todo
import '../../../../exported.js';

import { AmountMath } from '@agoric/ertp';

import { makeAddCollateralInvitation } from '../../../../src/contracts/loan/addCollateral.js';
import { makeFakePriceAuthority } from '../../../../tools/fakePriceAuthority.js';
import buildManualTimer from '../../../../tools/manualTimer.js';

import {
  setupLoanUnitTest,
  makeSeatKit,
  performAddCollateral,
} from './helpers.js';
import { makeRatio } from '../../../../src/contractSupport/index.js';

test.todo('makeAddCollateralInvitation - test bad proposal');

test('makeAddCollateralInvitation', async t => {
  const { zcf, zoe, collateralKit, loanKit } = await setupLoanUnitTest();

  const collateral = AmountMath.make(collateralKit.brand, 10n);

  // Set up the collateral seat
  const { zcfSeat: collateralSeat } = await makeSeatKit(
    zcf,
    { give: { Collateral: collateral } },
    {
      Collateral: collateralKit.mint.mintPayment(collateral),
    },
  );

  const { zcfSeat: lenderSeat } = await zcf.makeEmptySeatKit();

  const timer = buildManualTimer(t.log);

  const priceAuthority = makeFakePriceAuthority({
    priceList: [],
    timer,
    actualBrandIn: collateralKit.brand,
    actualBrandOut: loanKit.brand,
  });

  const autoswapInstance = {};
  const getDebt = () => AmountMath.make(loanKit.brand, 100n);

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

  const addedAmount = AmountMath.make(collateralKit.brand, 3n);

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
    Collateral: AmountMath.add(collateral, addedAmount),
  });
});
