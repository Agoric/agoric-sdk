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
import { TimeMath } from '@agoric/time';
import { commonSetup } from '../supports.js';
import { type StakeIcaTerms } from '../../src/examples/stakeIca.contract.js';
import fetchedChainInfo from '../../src/fetched-chain-info.js';
import {
  buildQueryPacketString,
  buildQueryResponseString,
} from '../../tools/ibc-mocks.js';
import type { CosmosChainInfo } from '../../src/cosmos-api.js';
import {
  AmountArg,
  ChainAddress,
  DenomAmount,
} from '../../src/orchestration-api.js';
import { maxClockSkew } from '../../src/utils/cosmos.js';
import { UNBOND_PERIOD_SECONDS } from '../ibc-mocks.js';

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
  cosmosInterchainService,
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
      cosmosInterchainService,
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
    t.regex(chainAddress.value, /cosmos1/);
    t.like(chainAddress, { chainId: 'cosmoshub-4', encoding: 'bech32' });

    await t.throwsAsync(E(account).getBalances(), {
      message: 'not yet implemented',
    });

    await t.throwsAsync(E(account).getBalance('uatom'), {
      message: 'Queries not available for chain "cosmoshub-4"',
    });

    const accountP = E(publicFacet).makeAccount();
    const { value: address2 } = await E(accountP).getAddress();
    t.regex(address2, /cosmos1/);
    t.not(chainAddress.value, address2, 'account addresses are unique');
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
    t.regex(chainAddress.value, /osmo1/);
    t.like(chainAddress, { chainId: 'osmosis-1' });

    const buildMocks = () => {
      const balanceReq = buildQueryPacketString([
        QueryBalanceRequest.toProtoMsg({
          address: chainAddress.value,
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

test('delegate, undelegate, redelegate, withdrawReward', async t => {
  const { bootstrap } = await commonSetup(t);
  const { timer } = bootstrap;
  const { publicFacet } = await startContract(bootstrap);
  const account = await E(publicFacet).makeAccount();

  // XXX consider building a mock bank into remote chains. for now, assume
  // newly created accounts magically have tokens.
  const validatorAddr = {
    value: 'cosmosvaloper1test' as const,
    chainId: 'cosmoshub-4',
    encoding: 'bech32' as const,
  };
  const delegation = await E(account).delegate(validatorAddr, {
    denom: 'uatom',
    value: 10n,
  });
  t.is(delegation, undefined, 'delegation returns void');

  const undelegatationP = E(account).undelegate([
    {
      shares: '10',
      validatorAddress: validatorAddr.value,
    },
  ]);
  const completionTime = UNBOND_PERIOD_SECONDS + maxClockSkew;
  const notTooSoon = Promise.race([
    timer.wakeAt(completionTime - 1n).then(() => true),
    undelegatationP,
  ]);
  timer.advanceTo(completionTime, 'end of unbonding period');
  t.true(await notTooSoon, "undelegate doesn't resolve before completion_time");
  t.is(
    await undelegatationP,
    undefined,
    'undelegation returns void after completion_time',
  );

  const redelegation = await E(account).redelegate(
    validatorAddr,
    {
      ...validatorAddr,
      value: 'cosmosvaloper2test',
    },
    { denom: 'uatom', value: 10n },
  );
  t.is(redelegation, undefined, 'redelegation returns void');

  const expectedRewards: DenomAmount = { value: 1n, denom: 'uatom' };
  const rewards = await E(account).withdrawReward(validatorAddr);
  t.deepEqual(
    rewards,
    [expectedRewards], // XXX consider returning just the first entry since this is a single reward
    'withdraw reward returns description of rewards',
  );
});

test.todo('undelegate multiple delegations');

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

test('CosmosOrchestrationAccount - not yet implemented', async t => {
  const { bootstrap } = await commonSetup(t);
  const { publicFacet } = await startContract(bootstrap);
  const account = await E(publicFacet).makeAccount();
  const mockChainAddress: ChainAddress = {
    value: 'cosmos1test',
    chainId: 'cosmoshub-4',
    encoding: 'bech32',
  };
  const mockAmountArg: AmountArg = { value: 10n, denom: 'uatom' };

  await t.throwsAsync(E(account).getBalances(), {
    message: 'not yet implemented',
  });
  await t.throwsAsync(E(account).send(mockChainAddress, mockAmountArg), {
    message: 'not yet implemented',
  });
  // XXX consider, positioning amount + address args the same for .send and .transfer
  await t.throwsAsync(E(account).transfer(mockAmountArg, mockChainAddress), {
    message: 'not yet implemented',
  });
  await t.throwsAsync(E(account).transferSteps(mockAmountArg, null as any), {
    message: 'not yet implemented',
  });
  await t.throwsAsync(E(account).withdrawRewards(), {
    message: 'Not Implemented. Try using withdrawReward.',
  });
});
