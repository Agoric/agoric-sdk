import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { Nat } from '@endo/nat';
import { M, mustMatch } from '@endo/patterns';
import { createRequire } from 'module';
import type { CoinSDKType } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
import { MsgTransferResponse } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import type { IBCEvent } from '@agoric/vats';
import { MsgLiquidStakeResponse } from '@agoric/cosmic-proto/stride/stakeibc/tx.js';
import { MsgSendResponse } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/tx.js';
import { ChainAddressShape } from '../../src/typeGuards.js';
import { commonSetup } from '../supports.js';
import {
  buildVTransferEvent,
  buildMsgResponseString,
} from '../../tools/ibc-mocks.js';
import type { CosmosChainAddress } from '../../src/orchestration-api.js';
import type { FeeConfigShape } from '../../src/examples/elys-contract-type-gaurd.js';
import type { Bech32Address } from '@agoric/cosmic-proto/address-hooks.js';

const nodeRequire = createRequire(import.meta.url);

const contractName = 'elysStrideContract';
const contractFile = nodeRequire.resolve('../../src/examples/elys.contract.js');
type StartFn = typeof import('../../src/examples/elys.contract.js').start;

const deposit = async (
  coins: CoinSDKType,
  sourceChannel: any,
  sender: Bech32Address,
  receiver: CosmosChainAddress,
  transferBridge,
) => {
  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: receiver.value,
      target: receiver.value,
      sourceChannel,
      denom: coins.denom,
      amount: Nat(BigInt(coins.amount)),
      sender,
    }),
  );
  await eventLoopIteration();
};

export const createFeeTestConfig = (feeCollector): FeeConfigShape => {
  const feeConfig = {
    feeCollector,
    onBoardRate: {
      nominator: BigInt(20),
      denominator: BigInt(100),
    }, // 20%
    offBoardRate: {
      nominator: BigInt(10),
      denominator: BigInt(100),
    }, // 10%
  };
  return feeConfig;
};

test('Failing case: Wrong fee config', async t => {
  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge, ibcBridge },
    utils: { inspectLocalBridge, inspectDibcBridge, transmitTransferAck },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const allowedChains = ['cosmoshub'];

  const feeConfig = createFeeTestConfig('agoric1euw2t0lxgeerlpj0tcy77f9syrmgx26ehdx3sq');
  feeConfig.onBoardRate.denominator = BigInt(123);
  feeConfig.onBoardRate.nominator = BigInt(124);

  await t.throwsAsync(
    async () => {
      await E(zoe).startInstance(
        installation,
        undefined,
        {},
        { ...commonPrivateArgs, storageNode, feeConfig, allowedChains },
      );
    },
    { message: /Invalid fee config/ },
  );
});

test('Failing case: IBC transfer from host to stride chain fails, user receives token at host chain address', async t => {
  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge, ibcBridge },
    utils: { inspectLocalBridge, inspectDibcBridge, transmitTransferAck },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const feeConfig = createFeeTestConfig('agoric1euw2t0lxgeerlpj0tcy77f9syrmgx26ehdx3sq');
  const allowedChains = ['cosmoshub'];
  const myContract = await E(zoe).startInstance(
    installation,
    undefined,
    {},
    { ...commonPrivateArgs, storageNode, feeConfig, allowedChains },
  );
  t.notThrows(() =>
    mustMatch(
      myContract,
      M.splitRecord({
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
      }),
    ),
  );

  const agorichookAddress = await E(myContract.publicFacet).getLocalAddress();
  t.log('agorichookAddress', agorichookAddress);

  t.notThrows(() => mustMatch(agorichookAddress, ChainAddressShape));

  // send atom for stride liquid staking
  await t.notThrowsAsync(
    deposit(
      { amount: '10', denom: 'uatom' },
      'channel-405',
      'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
      agorichookAddress,
      transferBridge,
    ),
  );

  const { messages, address: execAddr } = inspectLocalBridge().at(-1);
  t.is(messages?.length, 1, 'transfer message sent');
  t.like(
    messages[0],
    {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'cosmos1test2',
      sender: execAddr,
      sourceChannel: 'channel-5',
      token: {
        amount: '8', // 20% fee
      },
    },
    'tokens transferred from LOA to COA',
  );

  // MsgSend response from host ICA to users address on host 8 uatom
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ21rS0hDOWpiM050YjNNdVltRnVheTUyTVdKbGRHRXhMazF6WjFObGJtUVNTUW9NWTI5emJXOXpNWFJsYzNReUVpMWpiM050YjNNeE56VmpOM2gzYkhrM2JuZDVZMmRvZDNkM09EZDRPRE5vTlRaMFpHdHFlSHBxWm5ZMU5XUWFDZ29GZFdGMGIyMFNBVGc9IiwibWVtbyI6IiJ9',
    buildMsgResponseString(MsgSendResponse, {}),
  );

  await transmitTransferAck();
  await transmitTransferAck();

  const acknowledgements = (await inspectDibcBridge()).bridgeEvents;

  // move token to users wallet on host, ack
  t.deepEqual(acknowledgements[4], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFaVlLSkM5amIzTnRiM011WW1GdWF5NTJNV0psZEdFeExrMXpaMU5sYm1SU1pYTndiMjV6WlE9PSJ9',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ21rS0hDOWpiM050YjNNdVltRnVheTUyTVdKbGRHRXhMazF6WjFObGJtUVNTUW9NWTI5emJXOXpNWFJsYzNReUVpMWpiM050YjNNeE56VmpOM2gzYkhrM2JuZDVZMmRvZDNkM09EZDRPRE5vTlRaMFpHdHFlSHBxWm5ZMU5XUWFDZ29GZFdGMGIyMFNBVGc9IiwibWVtbyI6IiJ9',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '1',
      source_channel: 'channel-2',
      source_port: 'icacontroller-3',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  for (const ack of acknowledgements) {
    t.log('acknowledgement ', ack as IBCEvent<'acknowledgementPacket'>);
  }
});

test('Failing case: Liquid stake on stride fails, user receives token at stride chain address', async t => {
  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge, ibcBridge },
    utils: { inspectLocalBridge, inspectDibcBridge, transmitTransferAck },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const feeConfig = createFeeTestConfig('agoric1euw2t0lxgeerlpj0tcy77f9syrmgx26ehdx3sq');
  const allowedChains = ['cosmoshub'];

  const myContract = await E(zoe).startInstance(
    installation,
    undefined, // issuers
    {}, // terms
    { ...commonPrivateArgs, storageNode, feeConfig, allowedChains },
  );
  t.notThrows(() =>
    mustMatch(
      myContract,
      M.splitRecord({
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
      }),
    ),
  );

  const agorichookAddress = await E(myContract.publicFacet).getLocalAddress();
  t.log('agorichookAddress', agorichookAddress);

  t.notThrows(() => mustMatch(agorichookAddress, ChainAddressShape));

  // send atom for stride liquid staking
  await t.notThrowsAsync(
    deposit(
      { amount: '10', denom: 'uatom' },
      'channel-405',
      'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
      agorichookAddress,
      transferBridge,
    ),
  );

  const { messages, address: execAddr } = inspectLocalBridge().at(-1);
  t.is(messages?.length, 1, 'transfer message sent');
  t.like(
    messages[0],
    {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'cosmos1test2',
      sender: execAddr,
      sourceChannel: 'channel-5',
      token: {
        amount: '8',
      },
    },
    'tokens transferred from LOA to COA',
  );

  // ack for transfer of atom from hub to stride
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ25RS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWtjS0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUTTVNUm9LQ2dWMVlYUnZiUklCT0NJTVkyOXpiVzl6TVhSbGMzUXlLZ3RqYjNOdGIzTXhkR1Z6ZERJQU9JRHdrc3ZkQ0E9PSIsIm1lbW8iOiIifQ==',
    buildMsgResponseString(MsgTransferResponse, { sequence: 1n }),
  );
  // Move uatom to users stride address response
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ3FnQkNod3ZZMjl6Ylc5ekxtSmhibXN1ZGpGaVpYUmhNUzVOYzJkVFpXNWtFb2NCQ2d0amIzTnRiM014ZEdWemRCSXRjM1J5YVdSbE1UYzFZemQ0ZDJ4NU4yNTNlV05uYUhkM2R6ZzNlRGd6YURVMmRHUnJhbmg2TTNwMlozRndHa2tLUkdsaVl5OUNRekZFUTBNek5EbEZPRGhGUkRnME9FSTRNa0kxUWpnNU9VVkNSVVZEUlVJM1FqVTNRemd4TnpWQk1qWTFNRVkzT1RneU5UZzFNREl5TmprMFFVRTBFZ0U0IiwibWVtbyI6IiJ9',
    buildMsgResponseString(MsgSendResponse, { sequence: 1n }),
  );

  await transmitTransferAck();
  await transmitTransferAck();

  const acknowledgements = (await inspectDibcBridge()).bridgeEvents;

  // move token to stride ack
  t.deepEqual(acknowledgements[3], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFamNLTVM5cFltTXVZWEJ3YkdsallYUnBiMjV6TG5SeVlXNXpabVZ5TG5ZeExrMXpaMVJ5WVc1elptVnlVbVZ6Y0c5dWMyVVNBZ2dCIn0=',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ25RS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWtjS0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUTTVNUm9LQ2dWMVlYUnZiUklCT0NJTVkyOXpiVzl6TVhSbGMzUXlLZ3RqYjNOdGIzTXhkR1Z6ZERJQU9JRHdrc3ZkQ0E9PSIsIm1lbW8iOiIifQ==',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '0',
      source_channel: 'channel-2',
      source_port: 'icacontroller-3',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  // send tokens to user's stride address ack
  t.deepEqual(acknowledgements[5], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFaVlLSkM5amIzTnRiM011WW1GdWF5NTJNV0psZEdFeExrMXpaMU5sYm1SU1pYTndiMjV6WlE9PSJ9',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ3FnQkNod3ZZMjl6Ylc5ekxtSmhibXN1ZGpGaVpYUmhNUzVOYzJkVFpXNWtFb2NCQ2d0amIzTnRiM014ZEdWemRCSXRjM1J5YVdSbE1UYzFZemQ0ZDJ4NU4yNTNlV05uYUhkM2R6ZzNlRGd6YURVMmRHUnJhbmg2TTNwMlozRndHa2tLUkdsaVl5OUNRekZFUTBNek5EbEZPRGhGUkRnME9FSTRNa0kxUWpnNU9VVkNSVVZEUlVJM1FqVTNRemd4TnpWQk1qWTFNRVkzT1RneU5UZzFNREl5TmprMFFVRTBFZ0U0IiwibWVtbyI6IiJ9',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '2',
      source_channel: 'channel-0',
      source_port: 'icacontroller-1',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  for (const ack of acknowledgements) {
    t.log('acknowledgement ', ack as IBCEvent<'acknowledgementPacket'>);
  }
});

test('Failing case: IBC transfer of statom from stride to elys chain fails, user receives sttoken at stride chain address', async t => {
  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge, ibcBridge },
    utils: { inspectLocalBridge, inspectDibcBridge, transmitTransferAck },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const feeConfig = createFeeTestConfig('agoric1euw2t0lxgeerlpj0tcy77f9syrmgx26ehdx3sq');
  const allowedChains = ['cosmoshub'];

  const myContract = await E(zoe).startInstance(
    installation,
    undefined, // issuers
    {}, // terms
    { ...commonPrivateArgs, storageNode, feeConfig, allowedChains },
  );
  t.notThrows(() =>
    mustMatch(
      myContract,
      M.splitRecord({
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
      }),
    ),
  );

  const agorichookAddress = await E(myContract.publicFacet).getLocalAddress();
  t.log('agorichookAddress', agorichookAddress);

  t.notThrows(() => mustMatch(agorichookAddress, ChainAddressShape));

  // send atom for stride liquid staking
  await t.notThrowsAsync(
    deposit(
      { amount: '10', denom: 'uatom' },
      'channel-405',
      'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
      agorichookAddress,
      transferBridge,
    ),
  );

  const { messages, address: execAddr } = inspectLocalBridge().at(-1);
  t.is(messages?.length, 1, 'transfer message sent');
  t.like(
    messages[0],
    {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'cosmos1test2',
      sender: execAddr,
      sourceChannel: 'channel-5',
      token: {
        amount: '8',
      },
    },
    'tokens transferred from LOA to COA',
  );

  // Liquid stake response from stride
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ2pvS0h5OXpkSEpwWkdVdWMzUmhhMlZwWW1NdVRYTm5UR2x4ZFdsa1UzUmhhMlVTRndvTFkyOXpiVzl6TVhSbGMzUVNBVGdhQlhWaGRHOXQiLCJtZW1vIjoiIn0=',
    buildMsgResponseString(MsgLiquidStakeResponse, {
      stToken: { denom: 'statom', amount: '1800000' },
    }),
  );
  // ack for transfer of atom from hub to stride
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ25RS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWtjS0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUTTVNUm9LQ2dWMVlYUnZiUklCT0NJTVkyOXpiVzl6TVhSbGMzUXlLZ3RqYjNOdGIzTXhkR1Z6ZERJQU9JRHdrc3ZkQ0E9PSIsIm1lbW8iOiIifQ==',
    buildMsgResponseString(MsgTransferResponse, { sequence: 1n }),
  );
  // ack for transfer of statom from stride ICA to stride user address
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ204S0hDOWpiM050YjNNdVltRnVheTUyTVdKbGRHRXhMazF6WjFObGJtUVNUd29MWTI5emJXOXpNWFJsYzNRU0xYTjBjbWxrWlRFM05XTTNlSGRzZVRkdWQzbGpaMmgzZDNjNE4zZzRNMmcxTm5Sa2EycDRlak42ZG1keGNCb1JDZ1p6ZEdGMGIyMFNCekU0TURBd01EQT0iLCJtZW1vIjoiIn0=',
    buildMsgResponseString(MsgSendResponse, { sequence: 1n }),
  );

  await transmitTransferAck();
  await transmitTransferAck();

  const acknowledgements = (await inspectDibcBridge()).bridgeEvents;

  // move token to stride ack
  t.deepEqual(acknowledgements[3], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFamNLTVM5cFltTXVZWEJ3YkdsallYUnBiMjV6TG5SeVlXNXpabVZ5TG5ZeExrMXpaMVJ5WVc1elptVnlVbVZ6Y0c5dWMyVVNBZ2dCIn0=',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ25RS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWtjS0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUTTVNUm9LQ2dWMVlYUnZiUklCT0NJTVkyOXpiVzl6TVhSbGMzUXlLZ3RqYjNOdGIzTXhkR1Z6ZERJQU9JRHdrc3ZkQ0E9PSIsIm1lbW8iOiIifQ==',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '0',
      source_channel: 'channel-2',
      source_port: 'icacontroller-3',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  // Liquid stake ack
  t.deepEqual(acknowledgements[4], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFajRLSnk5emRISnBaR1V1YzNSaGEyVnBZbU11VFhOblRHbHhkV2xrVTNSaGEyVlNaWE53YjI1elpSSVRDaEVLQm5OMFlYUnZiUklITVRnd01EQXdNQT09In0=',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2pvS0h5OXpkSEpwWkdVdWMzUmhhMlZwWW1NdVRYTm5UR2x4ZFdsa1UzUmhhMlVTRndvTFkyOXpiVzl6TVhSbGMzUVNBVGdhQlhWaGRHOXQiLCJtZW1vIjoiIn0=',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '1',
      source_channel: 'channel-0',
      source_port: 'icacontroller-1',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  // move sttoken to users stride address ack
  t.deepEqual(acknowledgements[6], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFaVlLSkM5amIzTnRiM011WW1GdWF5NTJNV0psZEdFeExrMXpaMU5sYm1SU1pYTndiMjV6WlE9PSJ9',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ204S0hDOWpiM050YjNNdVltRnVheTUyTVdKbGRHRXhMazF6WjFObGJtUVNUd29MWTI5emJXOXpNWFJsYzNRU0xYTjBjbWxrWlRFM05XTTNlSGRzZVRkdWQzbGpaMmgzZDNjNE4zZzRNMmcxTm5Sa2EycDRlak42ZG1keGNCb1JDZ1p6ZEdGMGIyMFNCekU0TURBd01EQT0iLCJtZW1vIjoiIn0=',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '3',
      source_channel: 'channel-0',
      source_port: 'icacontroller-1',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  for (const ack of acknowledgements) {
    t.log('acknowledgement ', ack as IBCEvent<'acknowledgementPacket'>);
  }
});

test('Happy Flow: input atom at agoric receives statom on elys', async t => {
  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge, ibcBridge },
    utils: { inspectLocalBridge, inspectDibcBridge, transmitTransferAck },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const feeConfig = createFeeTestConfig('agoric1euw2t0lxgeerlpj0tcy77f9syrmgx26ehdx3sq');
  const allowedChains = ['cosmoshub'];

  const myContract = await E(zoe).startInstance(
    installation,
    undefined, // issuers
    {}, // terms
    { ...commonPrivateArgs, storageNode, feeConfig, allowedChains },
  );
  t.notThrows(() =>
    mustMatch(
      myContract,
      M.splitRecord({
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
      }),
    ),
  );

  const agorichookAddress = await E(myContract.publicFacet).getLocalAddress();
  t.log('agorichookAddress', agorichookAddress);

  t.notThrows(() => mustMatch(agorichookAddress, ChainAddressShape));

  // send atom for stride liquid staking
  await t.notThrowsAsync(
    deposit(
      { amount: '10', denom: 'uatom' },
      'channel-405',
      'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
      agorichookAddress,
      transferBridge,
    ),
  );

  const { messages, address: execAddr } = inspectLocalBridge().at(-1);
  t.is(messages?.length, 1, 'transfer message sent');
  t.like(
    messages[0],
    {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'cosmos1test2',
      sender: execAddr,
      sourceChannel: 'channel-5',
      token: {
        amount: '8',
      },
    },
    'tokens transferred from LOA to COA',
  );

  // Liquid stake response from stride
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ2pvS0h5OXpkSEpwWkdVdWMzUmhhMlZwWW1NdVRYTm5UR2x4ZFdsa1UzUmhhMlVTRndvTFkyOXpiVzl6TVhSbGMzUVNBVGdhQlhWaGRHOXQiLCJtZW1vIjoiIn0=',
    buildMsgResponseString(MsgLiquidStakeResponse, {
      stToken: { denom: 'statom', amount: '1800000' },
    }),
  );
  // ack for transfer of atom from hub to stride
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ25RS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWtjS0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUTTVNUm9LQ2dWMVlYUnZiUklCT0NJTVkyOXpiVzl6TVhSbGMzUXlLZ3RqYjNOdGIzTXhkR1Z6ZERJQU9JRHdrc3ZkQ0E9PSIsIm1lbW8iOiIifQ==',
    buildMsgResponseString(MsgTransferResponse, { sequence: 1n }),
  );
  // ack for transfer of statom from stride to elys
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ3BvQkNpa3ZhV0pqTG1Gd2NHeHBZMkYwYVc5dWN5NTBjbUZ1YzJabGNpNTJNUzVOYzJkVWNtRnVjMlpsY2hKdENnaDBjbUZ1YzJabGNoSUxZMmhoYm01bGJDMDVPVGthRVFvR2MzUmhkRzl0RWdjeE9EQXdNREF3SWd0amIzTnRiM014ZEdWemRDb3JaV3g1Y3pFM05XTTNlSGRzZVRkdWQzbGpaMmgzZDNjNE4zZzRNMmcxTm5Sa2EycDRlbXBtTkc1bE1ESUFPSUR3a3N2ZENBPT0iLCJtZW1vIjoiIn0=',
    buildMsgResponseString(MsgTransferResponse, { sequence: 1n }),
  );

  // fee send move token to host chain ack
  await transmitTransferAck();
  await transmitTransferAck();

  const acknowledgements = (await inspectDibcBridge()).bridgeEvents;

  // move token to stride ack
  t.deepEqual(acknowledgements[3], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFamNLTVM5cFltTXVZWEJ3YkdsallYUnBiMjV6TG5SeVlXNXpabVZ5TG5ZeExrMXpaMVJ5WVc1elptVnlVbVZ6Y0c5dWMyVVNBZ2dCIn0=',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ25RS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWtjS0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUTTVNUm9LQ2dWMVlYUnZiUklCT0NJTVkyOXpiVzl6TVhSbGMzUXlLZ3RqYjNOdGIzTXhkR1Z6ZERJQU9JRHdrc3ZkQ0E9PSIsIm1lbW8iOiIifQ==',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '0',
      source_channel: 'channel-2',
      source_port: 'icacontroller-3',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  // Liquid stake ack
  t.deepEqual(acknowledgements[4], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFajRLSnk5emRISnBaR1V1YzNSaGEyVnBZbU11VFhOblRHbHhkV2xrVTNSaGEyVlNaWE53YjI1elpSSVRDaEVLQm5OMFlYUnZiUklITVRnd01EQXdNQT09In0=',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2pvS0h5OXpkSEpwWkdVdWMzUmhhMlZwWW1NdVRYTm5UR2x4ZFdsa1UzUmhhMlVTRndvTFkyOXpiVzl6TVhSbGMzUVNBVGdhQlhWaGRHOXQiLCJtZW1vIjoiIn0=',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '1',
      source_channel: 'channel-0',
      source_port: 'icacontroller-1',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  // move sttoken to elys ack
  t.deepEqual(acknowledgements[5], {
    acknowledgement:
      'eyJyZXN1bHQiOiJFamNLTVM5cFltTXVZWEJ3YkdsallYUnBiMjV6TG5SeVlXNXpabVZ5TG5ZeExrMXpaMVJ5WVc1elptVnlVbVZ6Y0c5dWMyVVNBZ2dCIn0=',
    blockHeight: 289,
    blockTime: 1712180320,
    event: 'acknowledgementPacket',
    packet: {
      data: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ3BvQkNpa3ZhV0pqTG1Gd2NHeHBZMkYwYVc5dWN5NTBjbUZ1YzJabGNpNTJNUzVOYzJkVWNtRnVjMlpsY2hKdENnaDBjbUZ1YzJabGNoSUxZMmhoYm01bGJDMDVPVGthRVFvR2MzUmhkRzl0RWdjeE9EQXdNREF3SWd0amIzTnRiM014ZEdWemRDb3JaV3g1Y3pFM05XTTNlSGRzZVRkdWQzbGpaMmgzZDNjNE4zZzRNMmcxTm5Sa2EycDRlbXBtTkc1bE1ESUFPSUR3a3N2ZENBPT0iLCJtZW1vIjoiIn0=',
      destination_channel: 'channel-0',
      destination_port: 'icahost',
      sequence: '2',
      source_channel: 'channel-0',
      source_port: 'icacontroller-1',
      timeout_timestamp: '1712183910866313000',
    },
    relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
    type: 'IBC_EVENT',
  });

  for (const ack of acknowledgements) {
    t.log('acknowledgement ', ack as IBCEvent<'acknowledgementPacket'>);
  }
});
