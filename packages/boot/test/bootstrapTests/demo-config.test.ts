/* eslint-disable @jessie.js/safe-await-separator -- confused by casting 'as' */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { PowerFlags } from '@agoric/vats/src/walletFlags.js';

import type { TestFn } from 'ava';

import type { BridgeHandler, ScopedBridgeManager } from '@agoric/vats';
import type {
  TransferMiddleware,
  TransferVat,
} from '@agoric/vats/src/vat-transfer.js';
import { BridgeId } from '@agoric/internal';
import { keyArrayEqual, makeSwingsetTestKit } from '../../tools/supports.ts';

const { keys } = Object;

const makeDefaultTestContext = async t => {
  const swingsetTestKit = await makeSwingsetTestKit(
    t.log,
    'bundles/demo-config',
    { configSpecifier: '@agoric/vm-config/decentral-demo-config.json' },
  );
  return swingsetTestKit;
};

type DefaultTestContext = Awaited<ReturnType<typeof makeDefaultTestContext>>;

const test: TestFn<DefaultTestContext> = anyTest;

test.before(async t => (t.context = await makeDefaultTestContext(t)));
test.after.always(t => t.context.shutdown?.());

// Goal: test that prod config does not expose mailbox access.
// But on the JS side, aside from vattp, prod config exposes mailbox access
// just as much as dev, so we can't test that here.

const makeHomeFor = async (addr, EV) => {
  const clientCreator = await EV.vat('bootstrap').consumeItem('clientCreator');
  const clientFacet = await EV(clientCreator).createClientFacet(
    'user1',
    addr,
    PowerFlags.REMOTE_WALLET,
  );
  return EV(clientFacet).getChainBundle();
};

test('sim/demo config provides home with .myAddressNameAdmin', async t => {
  const devToolKeys = [
    'behaviors',
    'chainTimerService',
    'faucet',
    'priceAuthorityAdminFacet',
    'vaultFactoryCreatorFacet',
  ];

  // TODO: cross-check these with docs and/or deploy-script-support
  const homeKeys = [
    'agoricNames',
    'bank',
    'board',
    'ibcport',
    'localchain',
    'myAddressNameAdmin',
    'namesByAddress',
    'priceAuthority',
    'zoe',
    ...devToolKeys,
  ].sort();

  const { EV } = t.context.runUtils;
  await t.notThrowsAsync(EV.vat('bootstrap').consumeItem('provisioning'));
  t.log('bootstrap produced provisioning vat');
  const addr = 'agoric123';
  const home = await makeHomeFor(addr, EV);
  const actual = await EV(home.myAddressNameAdmin).getMyAddress();
  t.is(actual, addr, 'my address');
  keyArrayEqual(t, keys(home).sort(), homeKeys);
});

test('namesByAddress contains provisioned account', async t => {
  const { EV } = t.context.runUtils;
  const addr = 'agoric1234new';
  const home = await makeHomeFor(addr, EV);
  t.truthy(home);
  const namesByAddress =
    await EV.vat('bootstrap').consumeItem('namesByAddress');
  await t.notThrowsAsync(EV(namesByAddress).lookup(addr));
});

test('sim/demo config launches Vaults as expected by loadgen', async t => {
  const { EV } = t.context.runUtils;
  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const vaultsInstance = await EV(agoricNames).lookup(
    'instance',
    'VaultFactory',
  );
  t.truthy(vaultsInstance);
});

/**
 * decentral-demo-config.json now uses boot-sim.js, which includes
 * connectFaucet, which re-introduced USDC. That triggered a compatibility path
 * in the loadgen that caused it to try and fail to run the vaults task.
 * work-around: rename USDC to DAI in connectFaucet.
 *
 * TODO: move connectFaucet to a coreProposal and separate
 * decentral-demo-config.json into separate configurations for sim-chain,
 * loadgen.
 */
test('demo config meets loadgen constraint: no USDC', async t => {
  const { EV } = t.context.runUtils;
  const home = await makeHomeFor('addr123', EV);
  const pmtInfo = await EV(home.faucet).tapFaucet();
  const found = pmtInfo.find(p => p.issuerPetname === 'USDC');
  t.deepEqual(found, undefined);
});

// FIXME tests can pass when console shows "BOOTSTRAP FAILED"
test.todo('demo config bootstrap succeeds');

test('vtransfer', async t => {
  const { buildProposal, evalProposal, getOutboundMessages, runUtils } =
    t.context;
  const { EV } = runUtils;

  // Pull what transfer-proposal produced into local scope
  const transferVat = (await EV.vat('bootstrap').consumeItem(
    'transferVat',
  )) as ERef<TransferVat>;
  t.truthy(transferVat);
  const transferMiddleware = (await EV.vat('bootstrap').consumeItem(
    'transferMiddleware',
  )) as TransferMiddleware;
  t.truthy(transferMiddleware);
  const vtransferBridgeManager = (await EV.vat('bootstrap').consumeItem(
    'vtransferBridgeManager',
  )) as ScopedBridgeManager;
  t.truthy(vtransferBridgeManager);

  // only VTRANSFER_IBC_EVENT is supported by vtransferBridgeManager
  await t.throwsAsync(
    EV(vtransferBridgeManager).fromBridge({
      type: 'VTRANSFER_OTHER',
    }),
    {
      message:
        'Invalid inbound event type "VTRANSFER_OTHER"; expected "VTRANSFER_IBC_EVENT"',
    },
  );

  const target = 'agoric1vtransfertest';

  // 0 interceptors for target

  // it's an error to target an address before an interceptor is registered
  await t.throwsAsync(
    EV(vtransferBridgeManager).fromBridge({
      target,
      type: 'VTRANSFER_IBC_EVENT',
      event: 'echo',
    }),
    {
      message:
        'key "agoric1vtransfertest" not found in collection "targetToApp"',
    },
  );

  // 1 interceptors for target

  // Tap into VTRANSFER_IBC_EVENT messages
  await evalProposal(
    buildProposal('@agoric/builders/scripts/vats/test-vtransfer.js'),
  );

  // simulate a Golang upcall with arbitrary payload
  await EV(vtransferBridgeManager).fromBridge({
    target,
    type: 'VTRANSFER_IBC_EVENT',
    event: 'writeAcknowledgement',
    packet: 'thisIsPacket',
  });

  // verify the ackMethod outbound
  const messages = getOutboundMessages(BridgeId.VTRANSFER);
  t.deepEqual(messages, [
    {
      target: 'agoric1vtransfertest',
      type: 'BRIDGE_TARGET_REGISTER',
    },
    {
      ack: 'eyJldmVudCI6IndyaXRlQWNrbm93bGVkZ2VtZW50IiwicGFja2V0IjoidGhpc0lzUGFja2V0IiwidGFyZ2V0IjoiYWdvcmljMXZ0cmFuc2ZlcnRlc3QiLCJ0eXBlIjoiVlRSQU5TRkVSX0lCQ19FVkVOVCJ9',
      method: 'receiveExecuted',
      packet: 'thisIsPacket',
      type: 'IBC_METHOD',
    },
  ]);
  t.deepEqual(JSON.parse(atob(messages[1].ack)), {
    event: 'writeAcknowledgement',
    packet: 'thisIsPacket',
    target: 'agoric1vtransfertest',
    type: 'VTRANSFER_IBC_EVENT',
  });

  // TODO test adding an interceptor for the same target, which should fail
});
