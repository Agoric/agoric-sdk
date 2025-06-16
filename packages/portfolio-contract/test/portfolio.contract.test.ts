// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { MsgLock } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import type { Installation } from '@agoric/zoe';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import * as contractExports from '../src/portfolio.contract.ts';
import type { EVMContractAddresses } from '../src/type-guards.ts';
import { makeUSDNIBCTraffic } from './mocks.ts';
import { makeTrader } from './portfolio-actors.ts';
import { setupPortfolioTest } from './supports.ts';
import { makeWallet } from './wallet-offer-tools.ts';

const contractName = 'ymax0';
type StartFn = typeof contractExports.start;

export const contract: EVMContractAddresses = {
  aavePool: '0x87870Bca3F0fD6335C3F4ce8392D69350B4fA4E2', // Aave V3 Pool
  compound: '0xA0b86a33E6A3E81E27Da9c18c4A77c9Cd4e08D57', // Compound USDC
  factory: '0xef8651dD30cF990A1e831224f2E0996023163A81', // Factory contract
};

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
  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {}, // terms
    // @ts-expect-error XXX what's going on here?
    {
      ...common.commonPrivateArgs,
      contract,
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
  return { common, zoe, started };
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
  for (const { msg, ack } of Object.values(makeUSDNIBCTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }

  const doneP = trader1.openPortfolio(
    t,
    {
      USDN: usdc.units(3_333),
    },
    { evmChain: undefined },
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

test.todo('User can see transfer in progress');
test.todo('Pools SHOULD include Aave');
test.todo('Pools SHOULD include Compound');
