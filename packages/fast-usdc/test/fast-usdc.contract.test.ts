import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { MockCctpTxEvidences } from './fixtures.js';
import { commonSetup } from './supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../src/fast-usdc.contract.js`;
type StartFn = typeof import('../src/fast-usdc.contract.js').start;

test('start', async t => {
  const {
    brands: { poolShares, usdc },
    commonPrivateArgs,
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest({
    setJig: jig => {
      jig.chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);
    },
  });

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { creatorFacet, publicFacet } = await E(zoe).startInstance(
    installation,
    { PoolShares: poolShares.issuer, USDC: usdc.issuer },
    {
      poolFee: usdc.make(1n),
      contractFee: usdc.make(1n),
    },
    commonPrivateArgs,
  );
  t.truthy(creatorFacet);

  const e1 = await E(MockCctpTxEvidences.AGORIC_NO_PARAMS)();

  const inv = await E(publicFacet).makeTestPushInvitation(e1);
  // the invitation maker itself pushes the evidence

  // the offer is still safe to make
  const seat = await E(zoe).offer(inv);
  t.is(
    await E(seat).getOfferResult(),
    'noop; evidence was pushed in the invitation maker call',
  );
});
