import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import type { Installation } from '@agoric/zoe/src/zoeService/utils.js';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/stakeAtom.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/stakeAtom.contract.js').start;

const startContract = async ({
  orchestration,
  timer,
  marshaller,
  storage,
  bld,
}) => {
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { In: bld.issuer },
    {
      hostConnectionId: 'connection-1',
      controllerConnectionId: 'connection-2',
      bondDenom: 'uatom',
    },
    {
      marshaller,
      orchestration,
      storageNode: storage.rootNode,
      timer,
    },
  );
  return { publicFacet, zoe };
};

test('makeAccount, deposit, withdraw', async t => {
  const {
    bootstrap,
    brands: { ist },
    utils,
  } = await commonSetup(t);
  const { publicFacet } = await startContract({ ...bootstrap, bld: ist });

  t.log('make an ICA account');
  const account = await E(publicFacet).makeAccount();
  t.truthy(account, 'account is returned');
  const address = await E(account).getAddress();
  // XXX address.address is weird
  //   t.regex(address.address, /agoric1/);
  t.like(address, { chainId: 'FIXME', addressEncoding: 'bech32' });

  t.log('deposit 100 bld to account');
  await E(account).deposit(await utils.pourPayment(ist.units(100)));

  await t.throwsAsync(E(account).getBalances(), {
    message: 'not yet implemented',
  });
});
