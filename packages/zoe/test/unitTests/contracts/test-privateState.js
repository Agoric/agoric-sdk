// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';
import { AmountMath } from '@agoric/ertp';

import { setup } from '../setupBasicMints.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const privateStateRoot = `${dirname}/../../../src/contracts/privateState.js`;

test('example of private state', async t => {
  const { moolaKit, moola, zoe } = setup();

  // pack the contract
  const bundle = await bundleSource(privateStateRoot);
  // install the contract
  const installationP = E(zoe).install(bundle);

  const issuerKeywordRecord = harden({
    Collateral: moolaKit.issuer,
  });
  const { publicFacet } = await E(zoe).startInstance(
    installationP,
    issuerKeywordRecord,
  );

  const startAddingLiquidityInvitation1 = E(publicFacet).startAddingLiquidity();

  const moola1 = moola(1n);

  const userSeat1 = E(zoe).offer(
    startAddingLiquidityInvitation1,
    harden({ give: { Collateral: moola1 } }),
    harden({ Collateral: moolaKit.mint.mintPayment(moola1) }),
  );

  const offerResult1 = E(userSeat1).getOfferResult();

  const balance1 = await E(offerResult1).getBalance();

  t.true(AmountMath.isEqual(balance1, moola1));

  const addMoreLiquidityInvitation = E(offerResult1).addMoreLiquidity();

  const userSeat2 = E(zoe).offer(
    addMoreLiquidityInvitation,
    harden({ give: { Collateral: moola1 } }),
    harden({ Collateral: moolaKit.mint.mintPayment(moola1) }),
  );

  const offerResult2 = E(userSeat2).getOfferResult();

  const balance2 = await E(offerResult2).getBalance();

  t.true(AmountMath.isEqual(balance2, AmountMath.add(moola1, moola1)));

  // But if someone starts from the publicFacet again, they get their
  // own private state

  const startAddingLiquidityInvitation2 = E(publicFacet).startAddingLiquidity();

  const moola50 = moola(50n);

  const userSeatForOtherUser = E(zoe).offer(
    startAddingLiquidityInvitation2,
    harden({ give: { Collateral: moola50 } }),
    harden({ Collateral: moolaKit.mint.mintPayment(moola50) }),
  );

  const offerResultForOtherUser = E(userSeatForOtherUser).getOfferResult();

  const balanceForOtherUser = await E(offerResultForOtherUser).getBalance();

  t.true(AmountMath.isEqual(balanceForOtherUser, moola50));
});
