import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { BridgeId } from '@agoric/internal';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { defaultAbiCoder } from '@ethersproject/abi';
import { utils } from 'ethers';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ExecutionContext, TestFn } from 'ava';
import { makeWalletFactoryContext } from '../bootstrapTests/walletFactory.js';

type WalletFactoryContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;

export type TestContext = WalletFactoryContext & {
  wallet: any;
  previousOfferId: string | null;
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

const makeTestContext = async (t: ExecutionContext) => {
  const ctx = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );

  const wallet =
    await ctx.walletFactoryDriver.provideSmartWallet('agoric1makeAccount');

  const fullCtx = {
    ...ctx,
    wallet,
    previousOfferId: null,
  };

  return fullCtx;
};

let evmTransactionCounter = 0;

/**
 * @typedef {object} MakeEVMTransactionParams
 * @property {import('@agoric/smart-wallet/src/smartWallet.js').SmartWallet} wallet
 * @property {string} previousOffer
 * @property {string} methodName
 * @property {any} offerArgs
 * @property {any} proposal
 */

/**
 * Initiates an EVM transaction offer through the smart wallet.
 *
 * @param {MakeEVMTransactionParams} params
 * @returns {Promise<string>}
 */
const makeEVMTransaction = async ({
  wallet,
  previousOffer,
  methodName,
  offerArgs,
  proposal,
}) => {
  const id = `evmTransaction${evmTransactionCounter}`;

  /** @type {import('@agoric/smart-wallet/src/invitations.js').ContinuingInvitationSpec} */
  const proposeInvitationSpec = {
    source: 'continuing',
    previousOffer,
    invitationMakerName: 'makeEVMTransactionInvitation',
    invitationArgs: harden([methodName, offerArgs]),
  };

  evmTransactionCounter += 1;

  await wallet.executeOffer({
    id,
    invitationSpec: proposeInvitationSpec,
    proposal,
  });
  await eventLoopIteration();
  return id;
};

test.before(async t => {
  t.context = await makeTestContext(t);

  const { evalProposal, buildProposal } = t.context;

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
});

test('makeAccount via axelarGmp', async t => {
  const {
    storage,
    wallet,
    bridgeUtils: { runInbound },
  } = t.context;

  t.log('create an LCA');
  const { ATOM, BLD } = t.context.agoricNamesRemotes.brand;

  await wallet.sendOffer({
    id: 'axelarMakeAccountCall',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['createAndMonitorLCA']],
    },
    proposal: {},
  });

  const getLogged = () =>
    JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

  t.deepEqual(getLogged(), [
    'Inside createAndMonitorLCA',
    'localAccount created successfully',
    'tap created successfully',
    'Monitoring transfers setup successfully',
  ]);

  t.log('get lca address');

  const previousOfferId =
    wallet.getCurrentWalletRecord().offerToUsedInvitation[0][0];

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'getAddress',
    offerArgs: [],
    proposal: {},
  });

  // @ts-expect-error
  const lcaAddress = wallet.getLatestUpdateRecord().status.result;
  t.truthy(lcaAddress);
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      numWantsSatisfied: 1,
      result: lcaAddress,
    },
  });

  t.log('fund lca address');

  const ATOM_DENOM = 'uatom';
  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'getBalance',
    offerArgs: [ATOM_DENOM],
    proposal: {},
  });

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      numWantsSatisfied: 1,
      result: 'transfer success',
    },
  });

  return;

  t.log('Execute offers via the LCA');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'send',
    offerArgs: [
      {
        value: 'agoric1EOAAccAddress',
        chainId: 'agoriclocal',
        encoding: 'bech32',
      },
      { denom: 'ibc/1234', value: 10n },
    ],
    proposal: {},
  });

  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-0',
      sequence: '1',
    }),
  );

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      numWantsSatisfied: 1,
      result: 'transfer success',
    },
  });

  t.log('receiveUpcall test');

  const {
    channelId: agoricToAxelarChannel,
    counterPartyChannelId: axelarToAgoricChannel,
  } = fetchedChainInfo.agoric.connections.axelar.transferChannel;

  const payload = defaultAbiCoder.encode(
    ['address'],
    ['0x20E68F6c276AC6E297aC46c84Ab260928276691D'],
  );

  const base64Payload = Buffer.from(payload.slice(2), 'hex').toString('base64');

  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sequence: '1',
      amount: 1n,
      denom: 'uaxl',
      sender: makeTestAddress(),
      target: lcaAddress,
      receiver: lcaAddress,
      sourceChannel: axelarToAgoricChannel,
      destinationChannel: agoricToAxelarChannel,
      memo: JSON.stringify({
        source_chain: 'Ethereum',
        source_address: '0x19e71e7eE5c2b13eF6bd52b9E3b437bdCc7d43c8',
        destination_chain: 'agoric',
        destination_address: lcaAddress,
        payload: base64Payload,
      }),
    }),
  );

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'getEVMSmartWalletAddress',
    offerArgs: [],
    proposal: {},
  });

  // @ts-expect-error
  const evmSmartWalletAddress = wallet.getLatestUpdateRecord().status.result;
  t.truthy(evmSmartWalletAddress);

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      numWantsSatisfied: 1,
      result: evmSmartWalletAddress,
    },
  });

  t.log('send tokens via LCA');
  t.context.storage.data.delete('published.axelarGmp.log');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        type: 3,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Payload: null',
    'Initiating IBC Transfer...',
    'DENOM of token:ubld',
    'sendGmp successful',
  ]);

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      result: 'sendGmp successful',
    },
  });

  t.log('make offer with 0 amount');
  t.context.storage.data.delete('published.axelarGmp.log');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        type: 3,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 0n } },
    },
  }).catch(_err => {
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        error: 'Error: IBC transfer amount must be greater than zero',
      },
    });
  });

  t.log('make offer with unregistered vbank asset');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        type: 3,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { ATOM: { brand: ATOM, value: 1n } },
    },
  }).catch(_err => {
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        error:
          'Error: no denom detail for: "ibc/toyatom" on "agoric". ensure it is registered in chainHub.',
      },
    });
  });

  t.log('make contract calls via the LCA');
  t.context.storage.data.delete('published.axelarGmp.log');

  const newCountValue = 234;
  const encodedArgs = defaultAbiCoder.encode(['uint256'], [newCountValue]);

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
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
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Payload: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,230,143,108,39,106,198,226,151,172,70,200,74,178,96,146,130,118,105,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,209,78,98,184,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
    'Fee object {"amount":"20000","recipient":"axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd"}',
    'Initiating IBC Transfer...',
    'DENOM of token:ubld',
    'sendGmp successful',
  ]);

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      result: 'sendGmp successful',
    },
  });

  t.log('make offer without contractInvocationData');
  t.context.storage.data.delete('published.axelarGmp.log');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        type: 1,
        gasAmount: 20000,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  }).catch(_err => {
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        error: 'Error: contractInvocationData is not defined',
      },
    });
  });

  t.log('make offer without passing gas amount');
  t.context.storage.data.delete('published.axelarGmp.log');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        type: 1,
        destinationEVMChain: 'Ethereum',
        contractInvocationData: {
          functionSelector: utils.id('setCount(uint256)').slice(0, 10),
          deadline: 5000,
          nonce: 7,
          encodedArgs,
        },
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  }).catch(_err => {
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        error: 'Error: gasAmount must be defined',
      },
    });
  });
});
