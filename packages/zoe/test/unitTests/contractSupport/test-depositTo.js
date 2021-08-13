// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

import { setup } from '../setupBasicMints.js';
import { makeZoeKit } from '../../../src/zoeService/zoe.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';
import { depositToSeat } from '../../../src/contractSupport/zoeHelpers.js';
import { makeOffer } from '../makeOffer.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractRoot = `${dirname}/../zcf/zcfTesterContract.js`;

async function setupContract(moolaIssuer, bucksIssuer) {
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const { zoeService: zoe } = makeZoeKit(makeFakeVatAdmin(setJig).admin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installation = await zoe.install(bundle);

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Pixels: moolaIssuer,
    Money: bucksIssuer,
  });

  await E(zoe).startInstance(installation, issuerKeywordRecord);

  /** @type {ContractFacet} */
  const zcf = testJig.zcf;
  return { zoe, zcf };
}

test(`depositToSeat - groundZero`, async t => {
  const { moola, moolaIssuer, bucksMint, bucks, bucksIssuer } = setup();
  const { zoe, zcf } = await setupContract(moolaIssuer, bucksIssuer);

  const { zcfSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(3) }, give: { B: bucks(5) } }),
    harden({ B: bucksMint.mintPayment(bucks(5)) }),
  );
  const newBucks = bucksMint.mintPayment(bucks(2));
  await depositToSeat(zcf, zcfSeat, { B: bucks(2) }, { B: newBucks });
  t.deepEqual(
    zcfSeat.getCurrentAllocation(),
    { A: moola(0n), B: bucks(7n) },
    'should add deposit',
  );
});

test(`depositToSeat - keyword variations`, async t => {
  const { moola, moolaIssuer, bucksMint, bucks, bucksIssuer } = setup();
  const { zoe, zcf } = await setupContract(moolaIssuer, bucksIssuer);

  const { zcfSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(3) }, give: { B: bucks(5) } }),
    harden({ B: bucksMint.mintPayment(bucks(5)) }),
  );
  const newBucks = bucksMint.mintPayment(bucks(2));
  await depositToSeat(zcf, zcfSeat, { C: bucks(2) }, { C: newBucks });
  t.deepEqual(
    zcfSeat.getCurrentAllocation(),
    { A: moola(0n), B: bucks(5), C: bucks(2) },
    'should add deposit',
  );
});

test(`depositToSeat - mismatched keywords`, async t => {
  const { moola, moolaIssuer, bucksMint, bucks, bucksIssuer } = setup();
  const { zoe, zcf } = await setupContract(moolaIssuer, bucksIssuer);

  const { zcfSeat } = await makeOffer(
    zoe,
    zcf,
    harden({ want: { A: moola(3) }, give: { B: bucks(5) } }),
    harden({ B: bucksMint.mintPayment(bucks(5)) }),
  );
  const newBucks = bucksMint.mintPayment(bucks(2));
  await t.throwsAsync(
    () => depositToSeat(zcf, zcfSeat, { C: bucks(2) }, { D: newBucks }),
    {
      message:
        'The "D" keyword in the paymentKeywordRecord was not a keyword in proposal.give, which had keywords: ["C"]',
    },
    'mismatched keywords',
  );
  t.deepEqual(
    zcfSeat.getCurrentAllocation(),
    { A: moola(0n), B: bucks(5) },
    'should add deposit',
  );
});
