// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { MsgLock } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import type { Installation } from '@agoric/zoe';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { encodeAbiParameters } from 'viem';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import * as contractExports from '../src/portfolio.contract.ts';
import {
  axelarChainsMap,
  contractAddresses,
  makeUSDNIBCTraffic,
  makeIBCTransferTraffic,
} from './mocks.ts';
import { testChainInfo, setupPortfolioTest } from './supports.ts';
import { makeTrader } from './portfolio-actors.ts';
import { makeWallet } from './wallet-offer-tools.ts';
import { makeReceiveUpCallPayload } from '../../boot/tools/axelar-supports.js';

const contractName = 'ymax0';
type StartFn = typeof contractExports.start;
const { values } = Object;

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
  const timer = buildZoeManualTimer();

  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {}, // terms
    {
      ...common.commonPrivateArgs,
      contractAddresses,
      axelarChainsMap,
      timer,
      chainInfo: testChainInfo,
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
  return { common, zoe, started, timer };
};

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
    { evmChain: 'Ethereum' },
  );

  // ack IBC transfer for forward
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

  const done = await doneP;
  const result = done.result as any;
  t.is(passStyleOf(result.invitationMakers), 'remotable');
  t.like(result.publicTopics, [
    { description: 'USDN ICA', storagePath: 'cosmos:noble-1:cosmos1test' },
  ]);
  const [{ storagePath: myUSDNAddress }] = result.publicTopics;
  t.log('I can see where my money is:', myUSDNAddress);
  t.log('refund', done.payouts);
});

test('open portfolio with Aave position', async t => {
  const { common, zoe, started, timer } = await deploy(t);
  const { usdc } = common.brands;
  const { when } = common.utils.vowTools;

  const myBalance = usdc.units(10_000);
  const funds = await common.utils.pourPayment(myBalance);
  const myWallet = makeWallet({ USDC: usdc }, zoe, when);
  await E(myWallet).deposit(funds);

  const trader = makeTrader(myWallet, started.instance);
  t.log('Trader funds:', myBalance);

  const { ibcBridge } = common.mocks;

  // Add IBC transfer mocks
  // TODO: remove the loop
  for (const { msg, ack } of values(makeIBCTransferTraffic())) {
    ibcBridge.addMockAck(msg, ack);
    ibcBridge.addMockAck(msg, ack);
  }

  const doneP = trader.openPortfolio(
    t,
    {
      Aave: usdc.units(3_333),
      Gmp: usdc.units(100),
      Account: usdc.units(3_333),
    },
    { evmChain: 'Ethereum' },
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
      source_chain: 'ethereum',
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
  // Advance the timer by 180 time units to simulate the contract's wait
  await timer.tickN(180);
  // Simulate IBC acknowledgement for localAcct.transfer() in sendTokensViaCCTP()
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);

  const result = await doneP;
  t.log('Portfolio open result:', result);

  t.truthy(result, 'Portfolio should open successfully');
  t.is(
    passStyleOf(result.result.invitationMakers),
    'remotable',
    'Should have invitation makers',
  );

  t.log('EVM account creation completed');
});

test.todo('User can see transfer in progress');
test.todo('Pools SHOULD include Aave');
test.todo('Pools SHOULD include Compound');
