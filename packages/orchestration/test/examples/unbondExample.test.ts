import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/unbondExample.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/unbondExample.contract.js').start;

test('start', async t => {
  const {
    brands: { ist },
    commonPrivateArgs,
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer },
    {},
    commonPrivateArgs,
  );

  const inv = E(publicFacet).makeUnbondAndLiquidStakeInvitation();

  t.is(
    (await E(zoe).getInvitationDetails(inv)).description,
    'Unbond and liquid stake',
  );

  const userSeat = await E(zoe).offer(
    inv,
    {},
    {},
    { validator: 'agoric1valopsfufu' },
  );
  const result = await E(userSeat).getOfferResult();
  t.is(result, undefined);
});
