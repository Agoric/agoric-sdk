import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { heapVowE as VE } from '@agoric/vow/vat.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { Nat } from '@endo/nat';
import { M, mustMatch } from '@endo/patterns';
import { createRequire } from 'module';
import { ChainAddressShape } from '../../src/typeGuards.js';
import { buildVTransferEvent } from '../../tools/ibc-mocks.js';
import { commonSetup } from '../supports.js';
import type { CoinSDKType } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
import {
  buildTxPacketString,
  buildMsgResponseString,
} from '../../tools/ibc-mocks.js';
import {
  MsgTransfer,
  MsgTransferResponse,
} from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import type { IBCEvent } from '@agoric/vats';
import type { ChainAddress } from '../../src/orchestration-api.js';
import { MsgLiquidStakeResponse } from '../../cosmic-proto/dist/codegen/stride/stakeibc/tx.js';

const nodeRequire = createRequire(import.meta.url);

const contractName = 'elysStrideContract';
const contractFile = nodeRequire.resolve('../../src/examples/elys.contract.js');
type StartFn = typeof import('../../src/examples/elys.contract.js').start;

// test.beforeEach(async t => {
//   t.context = await commonSetup(t);
// });

test('start Elys-stride contract', async t => {
  // const { mocks, commonPrivateArgs, bootstrap } = t.context;
  // const {transmitTransferAck,inspectLocalBridge} = t.context.utils;

  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge, ibcBridge, },
    utils: { inspectLocalBridge,inspectDibcBridge, transmitTransferAck },
  } = await commonSetup(t);


  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  

  const myContract = await E(zoe).startInstance(
    installation,
    undefined, // issuers
    {}, // terms
    { ...commonPrivateArgs, storageNode },
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
  // By this time, agoric contract is ready to accept the deposit request from all the remote chains

  // transfer Atom from cosmoshub to agoric chain
  const deposit = async (
    coins: CoinSDKType,
    source_channel: any,
    sender: string,
    receiver: ChainAddress,
  ) => {
    await E(transferBridge).fromBridge(
      buildVTransferEvent({
        receiver: receiver.value,
        target: receiver.value,
        sourceChannel: source_channel,
        denom: coins.denom,
        amount: Nat(BigInt(coins.amount)),
        sender,
      }),
    );
    await eventLoopIteration();

    const { messages, address: execAddr } = inspectLocalBridge().at(-1);
    t.log('deposit messages :', messages)
    t.log('execAddress :', execAddr)
    t.is(messages?.length, 1, 'transfer message sent');
  };

  // const mockIbcTransferFromAgoricToHost = {
  //   sourcePort: 'transfer',
  //   sourceChannel: 'channel-5',
  //   token: {
  //     denom: 'uatom',
  //     amount: '10',
  //   },
  //   sender: 'agoric1fakeLCAAddress',
  //   receiver: 'cosmos1test2',
  //   timeoutHeight: {
  //     revisionHeight: 0n,
  //     revisionNumber: 0n,
  //   },
  //   timeoutTimestamp: 300000000000n, // 5 mins in ns
  //   memo: '',
  // };

  // const buildMocks = () => {
  //   const toTransferTxPacket = (msg: MsgTransfer) =>
  //     buildTxPacketString([MsgTransfer.toProtoMsg(msg)]);

  //   const agoricToHostTransfer = toTransferTxPacket(
  //     mockIbcTransferFromAgoricToHost,
  //   );

  //   const transferResp = buildMsgResponseString(MsgTransferResponse, {
  //     sequence: 1n,
  //   });

  //   return {
  //     [agoricToHostTransfer]: transferResp,
  //   };
  // };
  // ibcBridge.setMockAck(buildMocks());

  // send atom for stride liquid staking
  await t.notThrowsAsync(
    deposit(
      { amount: '10', denom: 'uatom' },
      'channel-405',
      'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
      agorichookAddress,
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
        amount: '10',
      },
    },
    'tokens transferred from LOA to COA',
  );

  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ2pzS0h5OXpkSEpwWkdVdWMzUmhhMlZwWW1NdVRYTm5UR2x4ZFdsa1UzUmhhMlVTR0FvTFkyOXpiVzl6TVhSbGMzUVNBakV3R2dWMVlYUnZiUT09IiwibWVtbyI6IiJ9',
    buildMsgResponseString(MsgLiquidStakeResponse, {stToken: {denom: 'statom', amount: '1800000'}}),
  );
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ25VS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWtnS0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUTTVNUm9MQ2dWMVlYUnZiUklDTVRBaURHTnZjMjF2Y3pGMFpYTjBNaW9MWTI5emJXOXpNWFJsYzNReUFEaUE4SkxMM1FnPSIsIm1lbW8iOiIifQ==',
    buildMsgResponseString(MsgTransferResponse, { sequence: 1n }),
  );
  
  await transmitTransferAck();
});
