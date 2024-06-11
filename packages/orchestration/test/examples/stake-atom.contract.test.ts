import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import type { Installation } from '@agoric/zoe/src/zoeService/utils.js';
import { commonSetup } from '../supports.js';
import { type StakeIcaTerms } from '../../src/examples/stakeIca.contract.js';

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
    chainId: 'cosmoshub-4',
    hostConnectionId: 'connection-1',
    controllerConnectionId: 'connection-2',
    bondDenom: 'uatom',
    icqEnabled: false,
  } as StakeIcaTerms,
}) => {
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    terms,
    {
      marshaller,
      orchestration,
      storageNode: storage.rootNode.makeChildNode('stakeAtom'),
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

test('makeAccountInvitationMaker', async t => {
  const {
    bootstrap,
    brands: { ist },
  } = await commonSetup(t);
  const { publicFacet, zoe } = await startContract({
    ...bootstrap,
    issuerKeywordRecord: { In: ist.issuer },
  });
  const inv = await E(publicFacet).makeAccountInvitationMaker();
  t.log('make an offer for ICA account');
  t.log('inv', inv);

  const seat = await E(zoe).offer(inv);
  t.log('seat', seat);
  const offerResult = await E(seat).getOfferResult();

  t.like(offerResult, {
    publicSubscribers: {
      account: {
        description: 'Staking Account holder status',
      },
    },
  });

  const accountNotifier = makeNotifierFromSubscriber(
    offerResult.publicSubscribers.account.subscriber,
  );
  const storageUpdate = await E(accountNotifier).getUpdateSince();
  t.deepEqual(storageUpdate, {
    updateCount: 1n,
    value: {
      sequence: 0n,
    },
  });

  // FIXME mock remoteAddress in ibc bridge
  const storagePath =
    'mockChainStorageRoot.stakeAtom.accounts.UNPARSABLE_CHAIN_ADDRESS';
  const vstorageEntry = bootstrap.storage.data.get(storagePath);
  if (typeof vstorageEntry !== 'string') {
    t.fail('vstorageEntry not found');
  } else {
    t.log(storagePath, vstorageEntry);
    t.regex(vstorageEntry, /sequence/);
  }
});
