import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { JsonSafe } from '@agoric/cosmic-proto';
import { QueryDelegatorDelegationsResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import { ResponseQuery } from '@agoric/cosmic-proto/tendermint/abci/types.js';
import { makeNameHubKit } from '@agoric/vats';
import {
  makePromiseSpaceForNameHub,
  makeWellKnownSpaces,
} from '@agoric/vats/src/core/utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { encodeBase64 } from '@endo/base64';
import { E, Far } from '@endo/far';
import path from 'path';
import { CosmosChainInfo } from '../../src/cosmos-api.js';
import { CHAIN_KEY } from '../../src/facade.js';
import type { OrchestrationService } from '../../src/service.js';
import type { ICQConnection } from '../../src/types.js';
import { agoricPeerInfo, chainRegistryInfo } from '../chain-info-fixture.js';
import { configStaking, mockAccount } from '../mockAccount.js';
import { commonSetup, makeFakeLocalchainBridge } from '../supports.js';

const { values } = Object;

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/unbondExample.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/unbondExample.contract.js').start;

const mockOrchestrationService = () => {
  globalThis.Decimal = {
    fromAtomics: () => {
      throw Error('is this thing on?');
    },
  };
  const it = Far('MockOrchestrationService', {
    makeAccount(idhost, idController) {
      const addr = 'addrTODO';
      const { delegations } = configStaking;
      const { account } = mockAccount(addr, delegations);
      return account;
    },
    provideICQConnection(idController) {
      const icqConnection = Far('ICQConnection', {
        async query(msgs) {
          console.log('ICQ query', msgs);
          if (
            msgs[0].path !==
            '/cosmos.staking.v1beta1.Query/DelegatorDelegations'
          ) {
            throw assert.error(`not supported: ${msgs[0].path}`);
          }

          const { delegations } = configStaking;
          const qddr = QueryDelegatorDelegationsResponse.fromPartial({
            delegationResponses: values(delegations).map(d => ({
              delegation: {
                delegatorAddress: 'addrDelegatorTODO',
                validatorAddress: 'addrValidatorTODO',
                shares: '1000000',
              },
              balance: d,
            })),
          });

          const thing1 =
            QueryDelegatorDelegationsResponse.encode(qddr).finish();
          const results = [
            { key: encodeBase64(thing1) } as JsonSafe<ResponseQuery>,
          ];
          return results;
        },
        getLocalAddress() {
          throw assert.error('not yet implemented');
        },
        getRemoteAddress() {
          throw assert.error('not yet implemented');
        },
      }) as ICQConnection;
      return icqConnection;
    },
  }) as any as OrchestrationService;
  return it;
};

test('start', async t => {
  const {
    bootstrap,
    brands: { ist },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const board = makeFakeBoard();
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  const spaces = await makeWellKnownSpaces(agoricNamesAdmin, t.log);

  t.log('orchestration coreEval');
  const localchainBridge = makeFakeLocalchainBridge(zone);
  const { makeLocalChain } = prepareLocalChainTools(zone.subZone('localchain'));
  const localchain = makeLocalChain({
    bankManager,
    system: localchainBridge,
  });

  // see makeWellKnownSpaces
  const { nameAdmin } = await E(agoricNamesAdmin).provideChild(CHAIN_KEY);
  const subSpaceLog = (...args) => t.log(CHAIN_KEY, ...args);
  makePromiseSpaceForNameHub(nameAdmin, subSpaceLog);

  const info = {
    ...agoricPeerInfo[0],
    ...chainRegistryInfo.celestia,
  } as CosmosChainInfo;
  await nameAdmin.update('celestia', info);

  const orchestrationService = mockOrchestrationService();

  t.log('contract coreEval');
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer },
    {},
    {
      localchain: bootstrap.localchain,
      orchestrationService: mockOrchestrationService(),
      storageNode: bootstrap.storage.rootNode,
      timerService: bootstrap.timer,
      board,
      agoricNames,
    },
  );

  t.log('do offer');
  const inv = E(publicFacet).makeUnbondAndLiquidStakeInvitation();

  const amt = await E(zoe).getInvitationDetails(inv);
  t.is(amt.description, 'Unbond and liquid stake');

  const userSeat = await E(zoe).offer(inv, undefined, undefined, {
    validator: 'agoric1valopsfufu',
  });
  const result = await E(userSeat).getOfferResult();
  t.is(result, undefined);
});

test('send using arbitrary chain info', async t => {
  t.log('bootstrap');
  const issuerKit = makeIssuerKit('IST');
  const stable = withAmountUtils(issuerKit);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const zone = makeHeapZone();
  const bankManager = await buildBankVatRoot(
    undefined,
    undefined,
    zone.mapStore('bankManager'),
  ).makeBankManager();

  await E(bankManager).addAsset('uist', 'IST', 'Inter Stable Token', issuerKit);

  const storage = makeFakeStorageKit('mockChainStorageRoot', {
    sequence: false,
  });

  const board = makeFakeBoard();
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  const spaces = await makeWellKnownSpaces(agoricNamesAdmin, t.log);
  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    'uist',
    /** @type {AssetInfo} */ harden({
      brand: stable.brand,
      issuer: stable.issuer,
      issuerName: 'IST',
      denom: 'uist',
      proposedName: 'IST',
      displayInfo: { IOU: true },
    }),
  );

  t.log('orchestration coreEval');
  const { makeLocalChain } = prepareLocalChainTools(zone.subZone('localchain'));
  const localchainBridge = makeFakeLocalchainBridge(zone);
  const localchain = makeLocalChain({
    bankManager,
    system: localchainBridge,
  });

  const orchestrationService = mockOrchestrationService();

  const contractName = 'sendAnywhere';
  t.log('contract coreEval', contractName);
  // TODO fix name
  const contractFile2 = `${dirname}/../../src/examples/${contractName}.contract.js`;
  type StartFn2 =
    typeof import('@agoric/orchestration/src/examples/sendAnywhere.contract.js').start;

  const installation: Installation<StartFn2> =
    await bundleAndInstall(contractFile2);

  const { instance, creatorFacet } = await E(zoe).startInstance(
    installation,
    { Stable: stable.issuer },
    {},
    {
      localchain,
      orchestrationService,
      storageNode: E(storage.rootNode).makeChildNode(contractName),
      timerService: null as any,
      board,
      agoricNames,
      agoricChainInfo: { connections: zone.mapStore('AC@@TODO') } as any,
      timerBrand: zone.exo('TB', undefined, {}) as any,
      marshaller: await E(board).getPublishingMarshaller(),
    },
  );

  const chainInfo = {
    ...agoricPeerInfo[0],
    ...chainRegistryInfo.celestia,
    allowedMessages: [],
    allowedQueries: [],
    chainId: 'may24',
    connections: zone.mapStore('may24 connections'),
    ibcHooksEnabled: false,
    icaEnabled: false,
    icqEnabled: false,
    pfmEnabled: false,
    stakingTokens: [{ denom: 'umay' }],
  } as CosmosChainInfo;
  await E(creatorFacet).addChain(chainInfo);

  t.log('do offer');
  const publicFacet = await E(zoe).getPublicFacet(instance);
  const inv = E(publicFacet).makeSendInvitation();

  const amt = await E(zoe).getInvitationDetails(inv);
  t.is(amt.description, 'send');

  const anAmt = stable.make(20n);
  const Send = stable.mint.mintPayment(anAmt);
  const dest = { destAddr: 'agoric1valopsfufu', chainKey: 0 };
  const userSeat = await E(zoe).offer(
    inv,
    { give: { Send: anAmt } },
    { Send },
    dest,
  );
  const result = await E(userSeat).getOfferResult();
  t.is(result, undefined);
});
