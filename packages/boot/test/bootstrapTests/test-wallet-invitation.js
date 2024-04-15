// @ts-check
/** @file test smart-wallet handling of failure to create invitation */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';

import { makeLiquidationTestContext } from '../../tools/liquidation.ts';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeLiquidationTestContext>>>}
 */
const test = anyTest;

test.before(async t => (t.context = await makeLiquidationTestContext(t)));
test.after.always(t => t.context.shutdown && t.context.shutdown());

/** @import { OfferSpec } from '@agoric/smart-wallet/src/smartWallet.js' */
test.serial('failure to make invitation', async t => {
  const { agoricNamesRemotes, walletFactoryDriver } = t.context;
  const minter = await walletFactoryDriver.provideSmartWallet('agoric1minter');

  const In = AmountMath.make(agoricNamesRemotes.brand.ATOM, 10_000_000n);

  /** @type {OfferSpec} */
  const offer1 = {
    id: `bad-invitation-spec`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['VaultFactory'],
      callPipe: [['bogusInvitationMaker']],
    },
    proposal: { give: { In } },
  };
  await t.throwsAsync(minter.executeOffer(offer1), {
    message: /^target has no method/,
  });

  // TODO: check the ATOM balance; we stub the go code that
  // tracks it, so it's not clear now to do so.

  const update1 = minter.getLatestUpdateRecord();
  t.like(update1, {
    updated: 'offerStatus',
    status: { id: offer1.id },
  });
  t.regex(update1.status.error, /TypeError: target has no method/);
});
