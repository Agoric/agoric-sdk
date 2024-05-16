import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { withAmountUtils } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/swapExample.contract.js`;

test('start', async t => {
  const usdc = withAmountUtils(makeIssuerKit('IST'));
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation = await bundleAndInstall(contractFile);

  const privateArgs = {
    orchestrationService: null,
    storageNode: null,
    timerService: null,
    zone: null,
  };

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {},
    privateArgs,
  );

  const inv = E(publicFacet).makeSwapAndStakeInvitation();

  t.is(
    (await E(zoe).getInvitationDetails(inv)).description,
    'Swap for TIA and stake',
  );

  const ten = usdc.units(10);
  const userSeat = await E(zoe).offer(
    inv,
    harden({ give: { USDC: ten } }),
    harden({ USDC: usdc.mint.mintPayment(ten) }),
  );
  const result = await E(userSeat).getOfferResult();
  t.is(result, undefined);
});
