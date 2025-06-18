// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { MsgLock } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.ts';
import { heapVowE as VE } from '@agoric/vow';
import type { Installation } from '@agoric/zoe';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { M, matches, mustMatch } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { protoMsgMocks } from '@agoric/orchestration/test/ibc-mocks.ts';
import {
  axelarChainsMap,
  contractAddresses,
  makeUSDNIBCTraffic,
  makeIBCTransferTraffic,
} from './mocks.ts';
import {
  chainInfo,
  setupPortfolioTest,
  makeIncomingEvent,
} from './supports.ts';
import { makeTrader } from './portfolio-actors.ts';
import { makeWallet } from './wallet-offer-tools.ts';
import { makeReceiveUpCallPayload } from '../../boot/tools/axelar-supports.js';
import { encodeAbiParameters } from 'viem';
import * as contractExports from '../src/portfolio.contract.ts';
import { DECODE_CONTRACT_CALL_RESULT_ABI } from '../src/portfolio.exo.ts';
import { makeProposalShapes } from '../src/type-guards.ts';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { q } from '@endo/errors';

const contractName = 'ymax0';
type StartFn = typeof contractExports.start;
const { values } = Object;

const lca0 = 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht';

/** from https://www.mintscan.io/noble explorer */
const explored = [
  {
    txhash: '50D671D1D56CF5041CBE7C3483EF461765196ECD7D7571CCEF0A612B46FC7A3B',
    messages: [
      {
        '@type': '/noble.swap.v1.MsgSwap',
        signer: 'noble1wtwydxverrrc673anqddyg3cmq3vhpu7yxy838',
        amount: { denom: 'uusdc', amount: '111000000' },
        // routes: [{ pool_id: '0', denom_to: 'uusdn' }],
        routes: [{ poolId: 0n, denomTo: 'uusdn' }],
        min: { denom: 'uusdn', amount: '110858936' },
      } satisfies MsgSwap & { '@type': string },
    ],
  },
  {
    txhash: 'BD97D42915C9185B11B14FEDC2EF6BCE0677E6720472DC6E1B51CCD504534237',
    messages: [
      {
        '@type': '/noble.dollar.vaults.v1.MsgLock',
        signer: 'noble1wtwydxverrrc673anqddyg3cmq3vhpu7yxy838',
        vault: 1, // 'STAKED',
        amount: '110818936',
      } satisfies MsgLock & { '@type': string },
    ],
  },
];
harden(explored);

const deploy = async (t: ExecutionContext) => {
  const common = await setupPortfolioTest(t);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);
  t.is(passStyleOf(installation), 'remotable');

  const { usdc } = common.brands;
  const timerService = buildZoeManualTimer();

  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {}, // terms
    {
      ...common.commonPrivateArgs,
      contractAddresses,
      axelarChainsMap,
      timerService,
      chainInfo,
    }, // privateArgs
  );
  t.notThrows(() =>
    mustMatch(
      started,
      M.splitRecord({
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
        // ...others are not relevant here
      }),
    ),
  );
  return { common, zoe, started, timerService };
};

test('ProposalShapes', t => {
  const { brand: USDC } = makeIssuerKit('USDC');
  const shapes = makeProposalShapes(USDC);

  const usdc = (value: bigint) => AmountMath.make(USDC, value);
  const cases = harden({
    openPortfolio: {
      pass: {
        noPositions: { give: {} },
        openUSDN: { give: { USDN: usdc(123n) } },
        aaveNeedsGMPFee: {
          give: { Gmp: usdc(123n), Aave: usdc(3000n), Account: usdc(3000n) },
        },
        open3: {
          give: {
            USDN: usdc(123n),
            Gmp: usdc(123n),
            Aave: usdc(3000n),
            Compound: usdc(1000n),
            Account: usdc(3000n),
          },
        },
      },
      fail: {
        noGive: {},
        missingGMPFee: { give: { Aave: usdc(3000n) } },
        noPayouts: { want: { USDN: usdc(123n) } },
        strayKW: { give: { X: usdc(1n) } },
      },
    },
    rebalance: {
      pass: {
        deposit: { give: { USDN: usdc(123n) } },
        withdraw: { want: { USDN: usdc(123n) } },
      },
      fail: {
        both: { give: { USDN: usdc(123n) }, want: { USDN: usdc(123n) } },
      },
    },
  });
  const { entries } = Object;
  for (const [desc, { pass, fail }] of entries(cases)) {
    for (const [name, proposal] of entries(pass)) {
      t.log(`${desc} ${name}: ${q(proposal)}`);
      // mustMatch() gives better diagnostics than matches()
      t.notThrows(() => mustMatch(proposal, shapes[desc]), name);
    }
    for (const [name, proposal] of entries(fail)) {
      t.log(`!${desc} ${name}: ${q(proposal)}`);
      t.false(matches(proposal, shapes[desc]), name);
    }
  }
});

test('open portfolio with USDN position', async t => {
  const { common, zoe, started } = await deploy(t);
  const { usdc } = common.brands;
  const { when } = common.utils.vowTools;

  const myBalance = usdc.units(10_000);
  const funds = await common.utils.pourPayment(myBalance);
  const myWallet = makeWallet({ USDC: usdc }, zoe, when);
  await E(myWallet).deposit(funds);
  const trader1 = makeTrader(myWallet, started.instance);
  t.log('I am a power user with', myBalance, 'on Agoric');

  const { ibcBridge } = common.mocks;
  for (const { msg, ack } of values(makeUSDNIBCTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }

  const doneP = trader1.openPortfolio(
    t,
    {
      USDN: usdc.units(3_333),
    },
    { destinationEVMChain: 'Ethereum' },
  );

  // ack IBC transfer for forward
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

  const done = await doneP;
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');
  t.is(result.publicTopics.length, 2);
  t.like(result.publicTopics, [
    { description: 'LCA', storagePath: `cosmos:agoric-3:${lca0}` },
    { description: 'USDN ICA', storagePath: 'cosmos:noble-1:cosmos1test' },
  ]);
  const addrs = result.publicTopics.map(t => t.storagePath);
  t.log('I can see where my money is:', addrs);
  t.log('refund', done.payouts);
});

// TODO: to deal with bridge coordination, move this to a bootstrap test
test.skip('open a portfolio with Aave position', async t => {
  const { common, zoe, started } = await deploy(t);
  const { usdc } = common.brands;
  const { when } = common.utils.vowTools;

  const myBalance = usdc.units(10_000);
  const funds = await common.utils.pourPayment(myBalance);
  const myWallet = makeWallet({ USDC: usdc }, zoe, when);
  await E(myWallet).deposit(funds);
  const trader1 = makeTrader(myWallet, started.instance);
  t.log('I am a power user with', myBalance, 'on Agoric');

  const { ibcBridge } = common.mocks;
  for (const { msg, ack } of Object.values(makeUSDNIBCTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }

  const actualP = trader1.openPortfolio(
    t,
    {
      Account: usdc.make(100n), // fee
      Gmp: usdc.make(100n), // fee
      Aave: usdc.units(3_333),
    },
    { destinationEVMChain: 'Base' },
  );
  await eventLoopIteration(); // let IBC message go out
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to Axelar to create account');

  const { transferBridge } = common.mocks;

  // stimulate upcall back from Axelar
  const event = makeIncomingEvent(lca0, 'Base');
  const ackNP = VE(transferBridge)
    .fromBridge(event)
    .finally(() => console.log('@@@fromBridge for tap done'))
    .then(() => eventLoopIteration())
    .then(() => {
      // ack CCTP
      common.utils
        .transmitVTransferEvent('acknowledgementPacket', -1)
        .then(() => eventLoopIteration())
        .finally(() => {
          console.log('@@@ack CCTP done');
          // ack IBC transfer to Axelar to open Aave position
          return common.utils
            .transmitVTransferEvent('acknowledgementPacket', -1)
            .finally(() => {
              console.log('@@@ack Axelar done');
              return;
            });
        });
    });

  const actual = await actualP;
  const result = actual.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');
  const addrs = result.publicTopics.map(t => t.storagePath);
  t.log('I can see where my money is:', addrs);
  t.is(result.publicTopics.length, 3);
  t.like(result.publicTopics, [
    { description: 'LCA', storagePath: lca0 },
    { description: 'USDN ICA', storagePath: 'cosmos:noble-1:cosmos1test' },
    // TODO: Aave topic
  ]);
  t.log('refund', actual.payouts);
});

// TODO: to deal with bridge coordination, move this to a bootstrap test
test.skip('open portfolio with USDN, Aave positions', async t => {
  const { common, zoe, started } = await deploy(t);
  const { usdc } = common.brands;
  const { when } = common.utils.vowTools;

  const myBalance = usdc.units(10_000);
  const funds = await common.utils.pourPayment(myBalance);
  const myWallet = makeWallet({ USDC: usdc }, zoe, when);
  await E(myWallet).deposit(funds);
  const trader1 = makeTrader(myWallet, started.instance);
  t.log('I am a power user with', myBalance, 'on Agoric');

  const { ibcBridge } = common.mocks;
  for (const { msg, ack } of Object.values(makeUSDNIBCTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }

  const doneP = trader1.openPortfolio(
    t,
    {
      Account: usdc.make(100n), // fee
      Gmp: usdc.make(100n), // fee
      Aave: usdc.units(3_333),
    },
    { destinationEVMChain: 'Base' },
  );
  await eventLoopIteration(); // let outgoing IBC happen
  console.log('openPortfolio, eventloop');
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  console.log('ackd send to noble');

  const { transferBridge } = common.mocks;
  const agToAxelar = fetchedChainInfo.agoric.connections['axelar-dojo-1'];

  const arbEth = '0x3dA3050208a3F2e0d04b33674aAa7b1A9F9B313C';
  const p2 = encodeAbiParameters([{ type: 'address' }], [arbEth]);
  const payload = encodeAbiParameters(DECODE_CONTRACT_CALL_RESULT_ABI, [
    { isContractCallResult: false, data: [{ success: true, result: p2 }] },
  ]);
  const incoming: AxelarGmpIncomingMemo = {
    source_address: arbEth,
    type: 2,
    source_chain: 'Base',
    payload,
  };

  // ack IBC transfer to Noble
  const ackNP = VE(transferBridge)
    .fromBridge(
      buildVTransferEvent({
        receiver: 'TODO: receiver',
        target: lca0,
        sourceChannel: agToAxelar.transferChannel.counterPartyChannelId,
        denom: 'uusdc',
        amount: 123n,
        sender: `axelar1TODO`,
        memo: JSON.stringify(incoming),
      }),
    )
    .finally(() => console.log('@@@fromAxelar done'))
    .then(() => eventLoopIteration())
    .then(() => {
      // let outgoing IBC happen
      common.utils
        .transmitVTransferEvent('acknowledgementPacket', -1)
        .then(() => eventLoopIteration())
        .finally(() => {
          console.log('@@@ack Noble done');
          // ack IBC transfer to Axelar to set up account
          return common.utils
            .transmitVTransferEvent('acknowledgementPacket', -1)
            .finally(() => {
              console.log('@@@ack Axelar done');
              console.log('@@@fromBridge toTap');
              return;
            });
        });
    });

  await eventLoopIteration(); // let bridge I/O happen

  const [done] = await Promise.all([doneP, ackNP]);
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');
  const addrs = result.publicTopics.map(t => t.storagePath);
  t.log('I can see where my money is:', addrs);
  t.is(result.publicTopics.length, 3);
  t.like(result.publicTopics, [
    { description: 'LCA', storagePath: lca0 },
    { description: 'USDN ICA', storagePath: 'cosmos:noble-1:cosmos1test' },
    // TODO: Aave topic
  ]);
  t.log('refund', done.payouts);
});

// TODO: to deal with bridge coordination, move this to a bootstrap test
test.skip('open portfolio with Aave position', async t => {
  const { common, zoe, started, timerService } = await deploy(t);
  const { usdc } = common.brands;
  const { when } = common.utils.vowTools;

  const myBalance = usdc.units(10_000);
  const funds = await common.utils.pourPayment(myBalance);
  const myWallet = makeWallet({ USDC: usdc }, zoe, when);
  await E(myWallet).deposit(funds);

  const trader = makeTrader(myWallet, started.instance);
  t.log('Trader funds:', myBalance);

  const { ibcBridge } = common.mocks;

  const { transfer } = makeIBCTransferTraffic();
  // Mock ack for initRemoteEVMAccount IBC call
  ibcBridge.addMockAck(transfer.msg, transfer.ack);
  // Mock ack for the IBC transfer that occurs when sending tokens
  // from a local account to a Noble chain account inside sendTokensViaCCTP()
  ibcBridge.addMockAck(transfer.msg, transfer.ack);
  // Mock ack for a depositForBurn CCTP packet
  ibcBridge.addMockAck(
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ21jS0lTOWphWEpqYkdVdVkyTjBjQzUyTVM1TmMyZEVaWEJ2YzJsMFJtOXlRblZ5YmhKQ0NndGpiM050YjNNeGRHVnpkQklLTXpNek16QXdNREF3TUNJZ0FBQUFBQUFBQUFBQUFBQUFFbXp6cko2aEo1VC9VUFZuSjhmR2JpYlp3SklxQlhWMWMyUmoiLCJtZW1vIjoiIn0=',
    protoMsgMocks.depositForBurn.ack,
  );
  // Mock ack for the IBC call that supplies tokens to AAVE protocol.
  ibcBridge.addMockAck(transfer.msg, transfer.ack);

  const doneP = trader.openPortfolio(
    t,
    {
      Aave: usdc.units(3_333),
      Gmp: usdc.units(100),
      Account: usdc.units(3_333),
    },
    { destinationEVMChain: 'Ethereum' },
  );

  // Simulate IBC acknowledgement for the initRemoteEVMAccount() transfer
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

  // Simulate an incoming response from EVM chain via Axelar
  const encodedAddress = encodeAbiParameters(
    [{ type: 'address' }],
    ['0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'],
  );
  const receiveUpCallEvent = buildVTransferEvent({
    sender: makeTestAddress(0, 'axelar'),
    memo: JSON.stringify({
      source_chain: 'Ethereum',
      source_address: '0x19e71e7eE5c2b13eF6bd52b9E3b437bdCc7d43c8',
      payload: makeReceiveUpCallPayload({
        isContractCallResult: false,
        data: [
          {
            success: true,
            result: encodedAddress,
          },
        ],
      }),
      type: 1,
    }),
    target: 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
  });

  await E(common.mocks.transferBridge).fromBridge(receiveUpCallEvent);
  // Simulate IBC acknowledgement for localAcct.transfer() in sendTokensViaCCTP()
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  // Advance the timer by 20 time units to wait for cctp transfer
  await timerService.tickN(20);
  // Simulate IBC acknowledgement for Aave
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  const result = await doneP;
  t.log('Portfolio open result:', result);

  t.truthy(result, 'Portfolio should open successfully');
  t.is(
    passStyleOf(result.result.invitationMakers),
    'remotable',
    'Should have invitation makers',
  );

  t.log('TODO: mock incoming response from AAVE');
});

test.todo('User can see transfer in progress');
test.todo('Pools SHOULD include Aave');
test.todo('Pools SHOULD include Compound');
