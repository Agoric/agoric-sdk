/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { withChainCapabilities, GMPMessageType } from '@agoric/orchestration';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import { minimalChainInfos } from '../tools/chainInfo.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;
test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

const testSetup = async t => {
  const {
    walletFactoryDriver,
    bridgeUtils: { runInbound },
    buildProposal,
    evalProposal,
    storage,
  } = t.context;

  t.log('start axelarGmp');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/init-axelar-gmp.js', [
      '--chainInfo',
      JSON.stringify(withChainCapabilities(minimalChainInfos)),
      '--assetInfo',
      JSON.stringify([
        [
          'uist',
          {
            baseDenom: 'uist',
            baseName: 'agoric',
            chainName: 'agoric',
          },
        ],
      ]),
    ]),
  );

  const wallet = await walletFactoryDriver.provideSmartWallet('agoric1test');
  const getLogged = () =>
    JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

  return { wallet, getLogged };
};

test('sendGMP with message only', async t => {
  const { wallet, getLogged } = await testSetup(t);
  const { IST } = t.context.agoricNamesRemotes.brand;
  const zero = { brand: IST, value: 0n };

  await wallet.sendOffer({
    id: 'sendGMPMessage',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['makeSendGMPInvitation']],
    },
    proposal: {},
    offerArgs: {
      destAddr: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
      type: GMPMessageType.MESSAGE_ONLY,
      destinationEVMChain: 'ethereum',
      gasAmount: 33,
      payload: [1, 2, 3, 4], // Example payload
    },
  });

  const logs = getLogged();
  t.true(logs.includes('got info for chain: osmosis-1'));
  t.true(logs.includes('payload received'));
});

test.todo('sendGMP with only tokens');

test('setCount on Counter contract (invoke contract)', async t => {
  const { wallet, getLogged } = await testSetup(t);

  await wallet.sendOffer({
    id: 'setCount',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['makeSetCountInvitation']],
    },
    proposal: {},
    offerArgs: {
      destAddr: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
      destinationEVMChain: 'ethereum',
      gasAmount: 33,
      params: {
        newCount: 42,
      },
    },
  });

  const logs = getLogged();
  t.true(logs.includes('got info for chain: osmosis-1'));
  t.true(logs.includes('payload received'));
});

test('depositToAave with tokens (invoke contract with tokens)', async t => {
  const { wallet, getLogged } = await testSetup(t);
  const { IST } = t.context.agoricNamesRemotes.brand;
  const amount = { brand: IST, value: 1000000n }; // 1 IST

  await wallet.sendOffer({
    id: 'depositToAave',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['makeDepositToAaveInvitation']],
    },
    proposal: {
      give: { Send: amount },
    },
    offerArgs: {
      destAddr: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
      destinationEVMChain: 'ethereum',
      gasAmount: 33,
      params: {
        onBehalfOf: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
        referralCode: 0,
      },
    },
  });

  const logs = getLogged();
  t.true(logs.includes('got info for chain: osmosis-1'));
  t.true(logs.includes('completed transfer to localAccount'));
  t.true(logs.includes('payload received'));
});
