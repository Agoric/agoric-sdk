// @ts-check
/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { BridgeId } from '@agoric/internal';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { AbiCoder } from '@ethersproject/abi';
import { utils } from 'ethers';

const test: TestFn<WalletFactoryTestContext> = anyTest;
test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

test('make contract calls via axelarGmp', async t => {
  const {
    walletFactoryDriver,
    bridgeUtils: { runInbound },
    buildProposal,
    evalProposal,
    storage,
  } = t.context;

  const { BLD } = t.context.agoricNamesRemotes.brand;

  t.log('start axelarGmp');

  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/init-axelar-gmp.js', [
      '--chainInfo',
      JSON.stringify({
        agoric: fetchedChainInfo.agoric,
        axelar: fetchedChainInfo.axelar,
      }),
      '--assetInfo',
      JSON.stringify([
        [
          'ubld',
          {
            baseDenom: 'ubld',
            brandKey: 'BLD',
            baseName: 'agoric',
            chainName: 'agoric',
          },
        ],
      ]),
    ]),
  );

  t.log('making offer');

  const abiCoder = new AbiCoder();
  const newCountValue = 234;
  const encodedArgs = abiCoder.encode(['uint256'], [newCountValue]);

  const wallet = await walletFactoryDriver.provideSmartWallet('agoric1test');
  await wallet.sendOffer({
    id: 'axelarGmpContractCall',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['gmpInvitation']],
    },
    proposal: {
      // @ts-expect-error XXX BoardRemote
      give: { BLD: { brand: BLD, value: 1n } },
    },
    offerArgs: {
      destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
      type: 1,
      gasAmount: 20000,
      destinationEVMChain: 'Ethereum',
      contractInvocationData: {
        functionSelector: utils.id('setCount(uint256)').slice(0, 10),
        deadline: 5000,
        nonce: 7,
        encodedArgs,
      },
    },
  });

  const getLogged = () =>
    JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

  // Flow started but IBC Transfer promise not resolved
  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Payload: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,230,143,108,39,106,198,226,151,172,70,200,74,178,96,146,130,118,105,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,209,78,98,184,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
    'Local transfer successful',
    'Fee object {"amount":"20000","recipient":"axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd"}',
    'Initiating IBC Transfer...',
    'DENOM of token:ubld',
  ]);

  // Simulate resolving IBC Transfer promise
  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-0',
      sequence: '1',
    }),
  );

  // Logs when IBC transfer promise is resolved
  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Payload: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,230,143,108,39,106,198,226,151,172,70,200,74,178,96,146,130,118,105,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,209,78,98,184,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
    'Local transfer successful',
    'Fee object {"amount":"20000","recipient":"axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd"}',
    'Initiating IBC Transfer...',
    'DENOM of token:ubld',
    'Offer successful',
  ]);
});
