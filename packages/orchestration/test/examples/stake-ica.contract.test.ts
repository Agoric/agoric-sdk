import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { heapVowE as E } from '@agoric/vow/vat.js';
import path from 'path';
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import type { Installation } from '@agoric/zoe/src/zoeService/utils.js';
import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { commonSetup } from '../supports.js';
import { type StakeIcaTerms } from '../../src/examples/stakeIca.contract.js';
import fetchedChainInfo from '../../src/fetched-chain-info.js';
import {
  buildQueryPacketString,
  buildQueryResponseString,
} from '../../tools/ibc-mocks.js';
import type { CosmosChainInfo } from '../../src/cosmos-api.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/stakeIca.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/stakeIca.contract.js').start;

const getChainTerms = (
  chainName: keyof typeof fetchedChainInfo,
  chainInfo: Record<string, CosmosChainInfo> = fetchedChainInfo,
): StakeIcaTerms => {
  const { chainId, stakingTokens, icqEnabled } = chainInfo[chainName];
  const agoricConns = chainInfo.agoric.connections!;
  if (!stakingTokens?.[0].denom) {
    throw Error(`Bond denom not found for chainName: ${chainName}`);
  }
  return {
    chainId,
    hostConnectionId: agoricConns[chainId].counterparty.connection_id,
    controllerConnectionId: agoricConns[chainId].id,
    bondDenom: stakingTokens[0].denom,
    icqEnabled: !!icqEnabled,
  };
};

const startContract = async ({
  orchestration,
  timer,
  marshaller,
  storage,
  issuerKeywordRecord = undefined,
  terms = getChainTerms('cosmoshub'),
  storagePath = 'stakeAtom',
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
      storageNode: storage.rootNode.makeChildNode(storagePath),
      timer,
    },
  );
  return { publicFacet, zoe };
};

test('makeAccount, getAddress, getBalances, getBalance', async t => {
  const { bootstrap } = await commonSetup(t);
  {
    // stakeAtom
    const { publicFacet } = await startContract(bootstrap);

    t.log('make an ICA account');
    const account = await E(publicFacet).makeAccount();
    t.truthy(account, 'account is returned');
    const chainAddress = await E(account).getAddress();
    t.regex(chainAddress.address, /cosmos1/);
    t.like(chainAddress, { chainId: 'cosmoshub-4', addressEncoding: 'bech32' });

    await t.throwsAsync(E(account).getBalances(), {
      message: 'not yet implemented',
    });

    await t.throwsAsync(E(account).getBalance('uatom'), {
      message: 'Queries not available for chain "cosmoshub-4"',
    });

    const accountP = E(publicFacet).makeAccount();
    const { address: address2 } = await E(accountP).getAddress();
    t.regex(address2, /cosmos1/);
    t.not(chainAddress.address, address2, 'account addresses are unique');
  }
  {
    // stakeOsmo
    const { ibcBridge } = bootstrap;
    await E(ibcBridge).setAddressPrefix('osmo');
    const { publicFacet } = await startContract({
      ...bootstrap,
      terms: getChainTerms('osmosis'),
      storagePath: 'stakeOsmo',
    });

    const account = await E(publicFacet).makeAccount();
    t.truthy(account, 'account is returned');
    const chainAddress = await E(account).getAddress();
    t.regex(chainAddress.address, /osmo1/);
    t.like(chainAddress, { chainId: 'osmosis-1' });

    const buildMocks = () => {
      const balanceReq = buildQueryPacketString([
        QueryBalanceRequest.toProtoMsg({
          address: chainAddress.address,
          denom: 'uosmo',
        }),
      ]);
      const balanceResp = buildQueryResponseString(QueryBalanceResponse, {
        balance: { amount: '0', denom: 'uosmo' },
      });
      return { [balanceReq]: balanceResp };
    };
    await E(ibcBridge).setMockAck(buildMocks());

    const balance = await E(account).getBalance('uosmo');
    t.deepEqual(balance, { denom: 'uosmo', value: 0n });
  }

  t.snapshot(bootstrap.storage.data.entries(), 'accounts in vstorage');
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

  const vstorageEntry = bootstrap.storage.data.get(
    'mockChainStorageRoot.stakeAtom.accounts.cosmos1test',
  );
  t.truthy(vstorageEntry, 'vstorage account entry created');
  t.is(bootstrap.marshaller.fromCapData(JSON.parse(vstorageEntry!)), '');
});
