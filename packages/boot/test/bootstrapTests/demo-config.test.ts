import { createRequire } from 'node:module';

import type { TestFn } from 'ava';

import { keyArrayEqual } from '@aglocal/boot/tools/supports.js';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { BridgeId, NonNullish, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { PowerFlags } from '@agoric/vats/src/walletFlags.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const { keys } = Object;
const { resolve: resolvePath } = createRequire(import.meta.url);

const makeDefaultTestContext = async () => {
  let lastBankNonce = 0n;
  const { toStorage } = makeFakeStorageKit('');

  const receiveBridgeSend = (bridgeId: BridgeId, obj: any) => {
    const bridgeType = `${bridgeId}:${obj.type}`;

    switch (bridgeId) {
      case BridgeId.STORAGE:
        return toStorage(obj);
      default:
        console.warn('bridgeId:', bridgeId, ', obj: ', obj);
    }

    switch (bridgeType) {
      case `${BridgeId.BANK}:VBANK_GET_BALANCE`:
        return '0';
      case `${BridgeId.BANK}:VBANK_GET_MODULE_ACCOUNT_ADDRESS`: {
        const { moduleName } = obj;
        const moduleDescriptor = Object.values(VBankAccount).find(
          ({ module }) => module === moduleName,
        );
        return !moduleDescriptor ? String(undefined) : moduleDescriptor.address;
      }
      case `${BridgeId.BANK}:VBANK_GIVE`: {
        lastBankNonce += 1n;
        return harden({
          nonce: `${lastBankNonce}`,
          type: 'VBANK_BALANCE_UPDATE',
          updated: [],
        });
      }
      case `${BridgeId.DIBC}:IBC_METHOD`:
        return String(undefined);
      default:
        break;
    }
  };

  const testkit = await makeCosmicSwingsetTestKit(receiveBridgeSend, {
    configOverrides: NonNullish(
      await loadSwingsetConfigFile(
        resolvePath('@agoric/vm-config/decentral-demo-config.json'),
      ),
    ),
  });
  await testkit.runNextBlock();

  return testkit;
};
type DefaultTestContext = Awaited<ReturnType<typeof makeDefaultTestContext>>;

const test: TestFn<DefaultTestContext> = anyTest;

test.before(async t => (t.context = await makeDefaultTestContext()));
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

  const { EV } = t.context;

  await t.notThrowsAsync(EV.vat('bootstrap').consumeItem('provisioning'));
  t.log('bootstrap produced provisioning vat');
  const addr = 'agoric123';
  const home = await makeHomeFor(addr, EV);
  const actual = await EV(home.myAddressNameAdmin).getMyAddress();
  t.is(actual, addr, 'my address');
  keyArrayEqual(t, keys(home).sort(), homeKeys);
});

test('namesByAddress contains provisioned account', async t => {
  const { EV } = t.context;
  const addr = 'agoric1234new';
  const home = await makeHomeFor(addr, EV);
  t.truthy(home);
  const namesByAddress =
    await EV.vat('bootstrap').consumeItem('namesByAddress');
  await t.notThrowsAsync(EV(namesByAddress).lookup(addr));
});

test('sim/demo config launches Vaults as expected by loadgen', async t => {
  const { EV } = t.context;
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
  const { EV } = t.context;
  const home = await makeHomeFor('addr123', EV);
  const pmtInfo = await EV(home.faucet).tapFaucet();
  const found = pmtInfo.find(p => p.issuerPetname === 'USDC');
  t.deepEqual(found, undefined);
});

// FIXME tests can pass when console shows "BOOTSTRAP FAILED"
test.todo('demo config bootstrap succeeds');
