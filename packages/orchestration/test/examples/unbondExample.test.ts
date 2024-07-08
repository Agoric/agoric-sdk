import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { inspectMapStore } from '@agoric/internal/src/testing-utils.js';
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

  let contractBaggage;
  const { zoe, bundleAndInstall } = await setUpZoeForTest({
    setJig: ({ baggage }) => {
      contractBaggage = baggage;
    },
  });
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

  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});
