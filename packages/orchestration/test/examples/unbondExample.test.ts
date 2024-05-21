import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { prepareLocalChainTools } from '@agoric/vats/src/localchain.js';
import { buildRootObject as buildBankVatRoot } from '@agoric/vats/src/vat-bank.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { E, Far } from '@endo/far';
import path from 'path';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import {
  makePromiseSpaceForNameHub,
  makeWellKnownSpaces,
} from '@agoric/vats/src/core/utils.js';
import { makeNameHubKit } from '@agoric/vats';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeFakeLocalchainBridge } from '../supports.js';
import { CHAIN_KEY } from '../../src/facade.js';
import { CosmosChainInfo } from '../../src/cosmos-api.js';
import { configStaking, mockAccount } from '../mockAccount.js';
import type { OrchestrationService } from '../../src/service.js';
import type { ICQConnection } from '../../src/types.js';
import { agoricPeerInfo, chainRegistryInfo } from '../chain-info-fixture.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/unbondExample.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/unbondExample.contract.js').start;

const mockOrchestrationService = () => {
  const it = Far('MockOrchestrationService', {
    makeAccount(idhost, idController) {
      const addr = 'addrTODO';
      const { delegations } = configStaking;
      const { account } = mockAccount(addr, delegations);
      return account;
    },
    provideICQConnection(idController) {
      const icqConnection = Far('ICQConnection', {}) as ICQConnection;
      return icqConnection;
    },
  }) as any as OrchestrationService;
  return it;
};

test('start', async t => {
  t.log('bootstrap');
  const issuerKit = makeIssuerKit('IST');
  const stable = withAmountUtils(issuerKit);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const zone = makeHeapZone();
  const { bankManager } = await makeFakeBankManagerKit();

  await E(bankManager).addAsset('uist', 'IST', 'Inter Stable Token', issuerKit);

  const storage = makeFakeStorageKit('mockChainStorageRoot', {
    sequence: false,
  });

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
    ...agoricPeerInfo.osmosis,
    ...chainRegistryInfo.celestia,
  } as CosmosChainInfo;
  await nameAdmin.update('celestia', info);

  const orchestrationService = mockOrchestrationService();

  t.log('contract coreEval');
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const privateArgs = {
    localchain,
    orchestrationService,
    storageNode: E(storage.rootNode).makeChildNode('unbondExample'),
    timerService: null as any,
    board,
    agoricNames,
  };

  const { instance } = await E(zoe).startInstance(
    installation,
    { Stable: stable.issuer },
    {},
    privateArgs,
  );

  t.log('do offer');
  const publicFacet = await E(zoe).getPublicFacet(instance);
  const inv = E(publicFacet).makeUnbondAndLiquidStakeInvitation();

  const amt = await E(zoe).getInvitationDetails(inv);
  t.is(amt.description, 'Unbond and liquid stake');

  const userSeat = await E(zoe).offer(inv, undefined, undefined, {
    validator: 'agoric1valopsfufu',
  });
  const result = await E(userSeat).getOfferResult();
  t.is(result, undefined);
});
