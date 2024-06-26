import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { heapVowE as E } from '@agoric/vow/vat.js';
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
  issuerKeywordRecord = undefined,
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
  const { publicFacet } = await startContract(bootstrap);

  t.log('make an ICA account');
  const account = await E(publicFacet).makeAccount();
  t.truthy(account, 'account is returned');
  const chainAddress = await E(account).getAddress();
  // FIXME mock remoteAddress in ibc bridge. Currently UNPARSABLE_CHAIN_ADDRESS
  // t.regex(address.address, /cosmos1/);
  t.like(chainAddress, { chainId: 'cosmoshub-4', addressEncoding: 'bech32' });

  await t.throwsAsync(E(account).getBalances(), {
    message: 'not yet implemented',
  });

  await t.throwsAsync(E(account).getBalance('uatom'), {
    message: 'Queries not available for chain "cosmoshub-4"',
  });
});

test('makeAccountInvitationMaker', async t => {
  const { bootstrap } = await commonSetup(t);
  const { publicFacet, zoe } = await startContract(bootstrap);
  const inv = await E(publicFacet).makeAccountInvitationMaker();
  t.log('make an offer for ICA account');

  const seat = await E(zoe).offer(inv);
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
    value: '',
  });

  // FIXME mock remoteAddress in ibc bridge
  const storagePath =
    'mockChainStorageRoot.stakeAtom.accounts.UNPARSABLE_CHAIN_ADDRESS';
  const vstorageEntry = bootstrap.storage.data.get(storagePath);
  t.truthy(vstorageEntry, 'vstorage account entry created');
  t.log(storagePath, vstorageEntry);
  t.is(bootstrap.marshaller.fromCapData(JSON.parse(vstorageEntry!)), '');
});
