import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import type { Installation } from '@agoric/zoe/src/zoeService/utils.js';
import { commonSetup } from '../supports.js';
import { type StakeAtomTerms } from '../../src/examples/stakeAtom.contract.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/stakeIca.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/stakeIca.contract.js').start;

const startContract = async ({
  orchestration,
  timer,
  marshaller,
  storage,
  issuerKeywordRecord,
  terms = {
    hostConnectionId: 'connection-1',
    controllerConnectionId: 'connection-2',
    bondDenom: 'uatom',
    icqEnabled: false,
  } as StakeAtomTerms,
}) => {
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { In: bld.issuer },
    {
      chainId: 'cosmoshub-4',
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

test('makeAccount, getAddress, getBalances, getBalance', async t => {
  const {
    bootstrap,
    brands: { ist },
    utils,
  } = await commonSetup(t);
  const { publicFacet } = await startContract({
    ...bootstrap,
    issuerKeywordRecord: { In: ist.issuer },
  });

  t.log('make an ICA account');
  const account = await E(publicFacet).makeAccount();
  t.truthy(account, 'account is returned');
  const chainAddress = await E(account).getAddress();
  // t.regex(address.address, /cosmos1/);
  t.like(chainAddress, { chainId: 'cosmoshub-4', addressEncoding: 'bech32' });

  t.log('deposit 100 bld to account');
  await E(account).deposit(await utils.pourPayment(ist.units(100)));

  await t.throwsAsync(E(account).getBalances(), {
    message: 'not yet implemented',
  });

  await t.throwsAsync(E(account).getBalance('uatom'), {
    message: 'Queries not enabled.',
  });
});
