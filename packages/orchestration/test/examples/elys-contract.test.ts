import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
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

const nodeRequire = createRequire(import.meta.url);

const contractName = 'elysStrideContract';
const contractFile = nodeRequire.resolve('../../src/examples/elys.contract.js');
type StartFn = typeof import('../../src/examples/elys.contract.js').start;

type TestContext = Awaited<ReturnType<typeof commonSetup>>;

const test = anyTest as TestFn<TestContext>;

test.beforeEach(async t => {
  t.context = await commonSetup(t);
});

test('start Elys-stride contract', async t => {
  const { mocks, commonPrivateArgs, bootstrap } = t.context;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(contractName);
  

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
  const { transferBridge, ibcBridge } = mocks;
  const deposit = async (
    coins: CoinSDKType,
    source_channel: any,
    sender: string,
  ) => {
    await E(transferBridge).fromBridge(
      buildVTransferEvent({
        receiver: agorichookAddress.value,
        target: agorichookAddress.value,
        sourceChannel: source_channel,
        denom: coins.denom,
        amount: Nat(BigInt(coins.amount)),
        sender,
      }),
    );
    await eventLoopIteration();
  };

  // const mockIbcTransferFromAgoricToHost = {
  //   sourcePort: 'transfer',
  //   sourceChannel: 'channel-5',
  //   token: {
  //     denom: 'uatom',
  //     amount: '10000000',
  //   },
  //   sender: 'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
  //   receiver: 'agoric1uydrqcdmr720ck7c9w54azswpavdzzednrvfwy',
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
  //     sequence: 0n,
  //   });

  //   return {
  //     [agoricToHostTransfer]: transferResp,
  //   };
  // };
  // ibcBridge.setMockAck(buildMocks());

  // send atom for stride liquid staking
  // await t.notThrowsAsync(
  //   deposit(
  //     { amount: '10000000', denom: 'uatom' },
  //     'channel-405',
  //     'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
  //   ),
  // );
  await deposit(
    { amount: '10000000', denom: 'uatom' },
    'channel-405',
    'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
  );

  const {transmitTransferAck,inspectLocalBridge} = t.context.utils;

  const { messages, address: execAddr } = inspectLocalBridge().at(-1);
  t.log("MESSAGE ", messages?.length);
  // t.log("execAddr  ",execAddr);
  // t.is(messages?.length, 1, 'transfer message sent');
  // t.like(
  //   messages[0],
  //   {
  //     '@type': '/ibc.applications.transfer.v1.MsgTransfer',
  //     receiver: 'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
  //     sender: execAddr,
  //     sourceChannel: 'channel-5',
  //     token: {
  //       amount: '10000000',
  //     },
  //   },
  //   'tokens transferred from LOA to COA',
  // );

  await transmitTransferAck();

  // let lastSequence = 0n;
  // await VE(transferBridge).fromBridge(
  //   buildVTransferEvent({
  //     receiver: 'cosmos175c7xwly7nwycghwww87x83h56tdkjxzjfv55d',
  //     sender: 'agoric1uydrqcdmr720ck7c9w54azswpavdzzednrvfwy',
  //     sourceChannel: 'channel-5',
  //     denom: 'ibc/uatom',
  //     amount: Nat(BigInt('10000000')),
  //     sequence: lastSequence,
  //   }),
  // );

  // await eventLoopIteration();
  // // send statom for stride liquid staking redeem
  // await t.notThrowsAsync(deposit({ amount: '10000000', denom: 'statom' },'channel-1266','elys1ultpdjygr6lnhhcrtsua8p22l5shvnz44mnhvy'));
});
