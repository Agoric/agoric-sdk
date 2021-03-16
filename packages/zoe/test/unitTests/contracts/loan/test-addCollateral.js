// ts-check

import '../../../../exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

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

  const collateral = collateralKit.amountMath.make(10);

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
    mathIn: collateralKit.amountMath,
    mathOut: loanKit.amountMath,
    priceList: [],
    timer,
  });

  const autoswapInstance = {};
  const getDebt = () => loanKit.amountMath.make(100);

  const config = {
    collateralSeat,
    lenderSeat,
    autoswapInstance,
    priceAuthority,
    getDebt,
    mmr: makeRatio(150, loanKit.brand),
  };
  const addCollateralInvitation = makeAddCollateralInvitation(zcf, config);

  const addedAmount = collateralKit.amountMath.make(3);

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
    Collateral: collateralKit.amountMath.add(collateral, addedAmount),
  });
});
