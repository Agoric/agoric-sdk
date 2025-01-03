import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { E } from '@endo/eventual-send';
import bundleSource from '@endo/bundle-source';

import { M } from '@endo/patterns';
import { AmountShape } from '@agoric/ertp';
import { makeZoeForTest } from '../../../tools/setup-zoe.js';
import { setup } from '../setupBasicMints.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractRoot = `${dirname}/zcfTesterContract.js`;

test(`ProposalShapes mismatch`, async t => {
  const { moolaIssuer, simoleanIssuer, moola, moolaMint } = setup();
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const { admin: fakeVatAdminSvc, vatAdminState } = makeFakeVatAdmin(setJig);
  /** @type {ZoeService} */
  const zoe = makeZoeForTest(fakeVatAdminSvc);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  vatAdminState.installBundle('b1-zcftester', bundle);
  const installation = await E(zoe).installBundleID('b1-zcftester');

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Pixels: moolaIssuer,
    Money: simoleanIssuer,
  });

  await E(zoe).startInstance(installation, issuerKeywordRecord);

  // The contract uses the testJig so the contractFacet
  // is available here for testing purposes
  /** @type {ZCF} */
  // @ts-expect-error cast
  const zcf = testJig.zcf;

  const boring = () => {
    return 'ok';
  };

  const proposalShape = M.splitRecord({
    give: { B: AmountShape },
    exit: { deadline: M.any() },
  });
  const invitation = await zcf.makeInvitation(
    boring,
    'seat1',
    {},
    proposalShape,
  );
  const { handle } = await E(zoe).getInvitationDetails(invitation);
  const shape = await E(zoe).getProposalShapeForInvitation(handle);
  t.deepEqual(shape, proposalShape);

  const proposal = harden({
    give: { B: moola(5n) },
    exit: { onDemand: null },
  });

  const fiveMoola = moolaMint.mintPayment(moola(5n));
  await t.throwsAsync(
    () =>
      E(zoe).offer(invitation, proposal, {
        B: fiveMoola,
      }),
    {
      message:
        '"seat1" proposal: exit: {"onDemand":null} - Must have missing properties ["deadline"]',
    },
  );
  t.falsy(vatAdminState.getHasExited());
  // The moola was not deposited.
  t.true(await E(moolaIssuer).isLive(fiveMoola));
});

test(`ProposalShapes matched`, async t => {
  const { moolaIssuer, simoleanIssuer } = setup();
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const { admin: fakeVatAdminSvc, vatAdminState } = makeFakeVatAdmin(setJig);
  /** @type {ZoeService} */
  const zoe = makeZoeForTest(fakeVatAdminSvc);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  vatAdminState.installBundle('b1-zcftester', bundle);
  const installation = await E(zoe).installBundleID('b1-zcftester');

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Pixels: moolaIssuer,
    Money: simoleanIssuer,
  });

  await E(zoe).startInstance(installation, issuerKeywordRecord);

  // The contract uses the testJig so the contractFacet
  // is available here for testing purposes
  /** @type {ZCF} */
  // @ts-expect-error cast
  const zcf = testJig.zcf;

  const boring = () => {
    return 'ok';
  };

  const proposalShape = M.splitRecord({ exit: { onDemand: null } });
  const invitation = await zcf.makeInvitation(
    boring,
    'seat',
    {},
    proposalShape,
  );
  const { handle } = await E(zoe).getInvitationDetails(invitation);
  const shape = await E(zoe).getProposalShapeForInvitation(handle);
  t.deepEqual(shape, proposalShape);

  // onDemand is the default
  const seat = await E(zoe).offer(invitation);

  const result = await E(seat).getOfferResult();
  t.is(result, 'ok', `userSeat1 offer result`);

  t.falsy(await E(seat).hasExited());
  await E(seat).tryExit();
  t.true(await E(seat).hasExited());
  const payouts = await E(seat).getPayouts();
  t.deepEqual(payouts, {});
});
