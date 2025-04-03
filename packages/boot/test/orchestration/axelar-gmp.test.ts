// @ts-check
/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { BridgeId } from '@agoric/internal';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { defaultAbiCoder } from '@ethersproject/abi';
import { utils } from 'ethers';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { waitUntilOfferExited } from '@agoric/client-utils';

let evmTransactionCounter = 0;

/**
 * @typedef {Object} MakeEVMTransactionParams
 * @property {import('@agoric/smart-wallet/src/smartWallet.js').SmartWallet} wallet - The smart wallet instance.
 * @property {string} previousOffer - The ID of the previous offer to continue from.
 * @property {string} methodName - The method name to call in the contract.
 * @property {any} offerArgs - The arguments required for the EVM transaction.
 * @property {any} proposal - The proposal describing what the user wants to give, receive, and the exit conditions.
 */

/**
 * Initiates an EVM transaction offer through the smart wallet.
 *
 * @param {MakeEVMTransactionParams} params - Parameters for the transaction.
 * @returns {Promise<string>} The ID of the newly created offer.
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

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );

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

test.beforeEach(t => {
  t.context.storage.data.delete('published.axelarGmp.log');
});

// test.serial('send tokens via axelarGmp', async t => {
//   const {
//     walletFactoryDriver,
//     bridgeUtils: { runInbound },

//     storage,
//   } = t.context;

//   const { BLD, ATOM } = t.context.agoricNamesRemotes.brand;

//   t.log('making offer');
//   const wallet =
//     await walletFactoryDriver.provideSmartWallet('agoric1SendTokens');
//   await wallet.sendOffer({
//     id: 'axelarGmp1',
//     invitationSpec: {
//       source: 'agoricContract',
//       instancePath: ['axelarGmp'],
//       callPipe: [['gmpInvitation']],
//     },
//     proposal: {
//       // @ts-expect-error XXX BoardRemote
//       give: { BLD: { brand: BLD, value: 1n } },
//     },
//     offerArgs: {
//       destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
//       type: 3,
//       destinationEVMChain: 'Ethereum',
//     },
//   });

//   const getLogged = () =>
//     JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

//   // Flow started but IBC Transfer promise not resolved
//   t.deepEqual(getLogged(), [
//     'Inside sendGmp',
//     'Payload: null',
//     'Local transfer successful',
//     'Initiating IBC Transfer...',
//     'DENOM of token:ubld',
//   ]);

//   // Simulate resolving IBC Transfer promise
//   await runInbound(
//     BridgeId.VTRANSFER,
//     buildVTransferEvent({
//       sender: makeTestAddress(),
//       target: makeTestAddress(),
//       sourceChannel: 'channel-0',
//       sequence: '1',
//     }),
//   );

//   // Logs when IBC transfer promise is resolved
//   t.deepEqual(getLogged(), [
//     'Inside sendGmp',
//     'Payload: null',
//     'Local transfer successful',
//     'Initiating IBC Transfer...',
//     'DENOM of token:ubld',
//     'Offer successful',
//   ]);

//   t.log('make offer with 0 amount');

//   await wallet.sendOffer({
//     id: 'axelarGmp2',
//     invitationSpec: {
//       source: 'agoricContract',
//       instancePath: ['axelarGmp'],
//       callPipe: [['gmpInvitation']],
//     },
//     proposal: {
//       // @ts-expect-error XXX BoardRemote
//       give: { BLD: { brand: BLD, value: 0n } },
//     },
//     offerArgs: {
//       destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
//       type: 3,
//       destinationEVMChain: 'Ethereum',
//     },
//   });

//   t.like(wallet.getLatestUpdateRecord(), {
//     status: {
//       id: 'axelarGmp2',
//       error: 'Error: IBC transfer amount must be greater than zero',
//     },
//   });

//   t.log('make offer with unregistered vbank asset');
//   await wallet.sendOffer({
//     id: 'axelarGmp3',
//     invitationSpec: {
//       source: 'agoricContract',
//       instancePath: ['axelarGmp'],
//       callPipe: [['gmpInvitation']],
//     },
//     proposal: {
//       // @ts-expect-error XXX BoardRemote
//       give: { BLD: { brand: ATOM, value: 1n } },
//     },
//     offerArgs: {
//       destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
//       type: 3,
//       destinationEVMChain: 'Ethereum',
//     },
//   });

//   t.like(wallet.getLatestUpdateRecord(), {
//     status: {
//       id: 'axelarGmp3',
//       error:
//         'Error: IBC Transfer failed "[Error: no denom detail for: \\"ibc/toyatom\\" on \\"agoric\\". ensure it is registered in chainHub.]"',
//     },
//   });
// });

// test.serial('make contract calls via axelarGmp', async t => {
//   const {
//     walletFactoryDriver,
//     bridgeUtils: { runInbound },

//     storage,
//   } = t.context;

//   const { BLD } = t.context.agoricNamesRemotes.brand;

//   t.log('making offer');

//   const newCountValue = 234;
//   const encodedArgs = defaultAbiCoder.encode(['uint256'], [newCountValue]);

//   const wallet = await walletFactoryDriver.provideSmartWallet(
//     'agoric1ContractCalls',
//   );
//   await wallet.sendOffer({
//     id: 'axelarGmpContractCall',
//     invitationSpec: {
//       source: 'agoricContract',
//       instancePath: ['axelarGmp'],
//       callPipe: [['gmpInvitation']],
//     },
//     proposal: {
//       // @ts-expect-error XXX BoardRemote
//       give: { BLD: { brand: BLD, value: 1n } },
//     },
//     offerArgs: {
//       destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
//       type: 1,
//       gasAmount: 20000,
//       destinationEVMChain: 'Ethereum',
//       contractInvocationData: {
//         functionSelector: utils.id('setCount(uint256)').slice(0, 10),
//         deadline: 5000,
//         nonce: 7,
//         encodedArgs,
//       },
//     },
//   });

//   const getLogged = () =>
//     JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

//   // Flow started but IBC Transfer promise not resolved
//   t.deepEqual(getLogged(), [
//     'Inside sendGmp',
//     'Payload: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,230,143,108,39,106,198,226,151,172,70,200,74,178,96,146,130,118,105,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,209,78,98,184,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
//     'Local transfer successful',
//     'Fee object {"amount":"20000","recipient":"axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd"}',
//     'Initiating IBC Transfer...',
//     'DENOM of token:ubld',
//   ]);

//   // Simulate resolving IBC Transfer promise
//   await runInbound(
//     BridgeId.VTRANSFER,
//     buildVTransferEvent({
//       sender: makeTestAddress(),
//       target: makeTestAddress(),
//       sourceChannel: 'channel-0',
//       sequence: '2',
//     }),
//   );

//   // Logs when IBC transfer promise is resolved
//   t.deepEqual(getLogged(), [
//     'Inside sendGmp',
//     'Payload: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,230,143,108,39,106,198,226,151,172,70,200,74,178,96,146,130,118,105,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,209,78,98,184,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
//     'Local transfer successful',
//     'Fee object {"amount":"20000","recipient":"axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd"}',
//     'Initiating IBC Transfer...',
//     'DENOM of token:ubld',
//     'Offer successful',
//   ]);

//   t.log('make offer without contractInvocationData');
//   await wallet.sendOffer({
//     id: 'axelarGmpContractCallII',
//     invitationSpec: {
//       source: 'agoricContract',
//       instancePath: ['axelarGmp'],
//       callPipe: [['gmpInvitation']],
//     },
//     proposal: {
//       // @ts-expect-error XXX BoardRemote
//       give: { BLD: { brand: BLD, value: 1n } },
//     },
//     offerArgs: {
//       destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
//       type: 1,
//       gasAmount: 20000,
//       destinationEVMChain: 'Ethereum',
//     },
//   });

//   t.like(wallet.getLatestUpdateRecord(), {
//     status: {
//       id: 'axelarGmpContractCallII',
//       error: 'Error: contractInvocationData is not defined',
//     },
//   });

//   t.log('make offer without passing gas amount');
//   await wallet.sendOffer({
//     id: 'axelarGmpContractCallIII',
//     invitationSpec: {
//       source: 'agoricContract',
//       instancePath: ['axelarGmp'],
//       callPipe: [['gmpInvitation']],
//     },
//     proposal: {
//       // @ts-expect-error XXX BoardRemote
//       give: { BLD: { brand: BLD, value: 1n } },
//     },
//     offerArgs: {
//       destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
//       type: 1,
//       destinationEVMChain: 'Ethereum',
//       contractInvocationData: {
//         functionSelector: utils.id('setCount(uint256)').slice(0, 10),
//         deadline: 5000,
//         nonce: 7,
//         encodedArgs,
//       },
//     },
//   });

//   t.like(wallet.getLatestUpdateRecord(), {
//     status: {
//       id: 'axelarGmpContractCallIII',
//       error: 'Error: gasAmount must be defined',
//     },
//   });
// });

test.serial('makeAccount via axelarGmp', async t => {
  const {
    walletFactoryDriver,
    storage,
    bridgeUtils: { runInbound },
  } = t.context;

  t.log('making offer');

  const wallet =
    await walletFactoryDriver.provideSmartWallet('agoric1makeAccount');
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

  // Flow started but IBC Transfer promise not resolved
  t.deepEqual(getLogged(), [
    'Inside createAndMonitorLCA',
    'localAccount created successfully',
    'tap created successfully',
    'Monitoring transfers setup successfully',
  ]);

  t.log('Execute offers via the LCA');

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

  t.log('sendGmp via LCA');

  const offerArgs = [
    {
      destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
      type: 3,
      destinationEVMChain: 'Ethereum',
    },
  ];

  const { ATOM } = t.context.agoricNamesRemotes.brand;

  await t.throwsAsync(
    () =>
      makeEVMTransaction({
        wallet,
        previousOffer: previousOfferId,
        methodName: 'sendGmp',
        offerArgs,
        proposal: {
          give: { ATOM: { brand: ATOM, value: 1n } },
        },
      }),
    {
      message:
        'no denom detail for: "ibc/toyatom" on "agoric". ensure it is registered in chainHub.',
    },
  );
});
