// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  MsgLock,
  MsgLockResponse,
} from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import {
  MsgSwap,
  MsgSwapResponse,
} from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import {
  buildMsgResponseString,
  buildTxPacketString,
} from '@agoric/orchestration/tools/ibc-mocks.ts';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import { createRequire } from 'module';
import type { YieldProtocol } from '../src/constants.js';
import { commonSetup } from './supports.js';
import { makeWallet, type WalletTool } from './wallet-offer-tools.ts';

const nodeRequire = createRequire(import.meta.url);

const contractName = 'ymax0';
const contractFile = nodeRequire.resolve('../src/portfolio.contract.ts');
type StartFn = typeof import('../src/portfolio.contract.ts').start;

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

const [signer, money] = ['cosmos1test', `${3_333 * 1_000_000}`];

const protoMsgMocks = {
  swap: {
    msg: buildTxPacketString([
      MsgSwap.toProtoMsg({
        signer,
        amount: { denom: 'uusdc', amount: money },
        routes: [{ poolId: 0n, denomTo: 'uusdn' }],
        min: { denom: 'uusdn', amount: money },
      }),
    ]),
    ack: buildMsgResponseString(MsgSwapResponse, {}),
  },
  lock: {
    msg: buildTxPacketString([
      MsgLock.toProtoMsg({ signer, vault: 1, amount: money }),
    ]),
    ack: buildMsgResponseString(MsgLockResponse, {}),
  },
  lockWorkaround: {
    // XXX { ..., vault: 1n } ???
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xvS0ZpOXViMkpzWlM1emQyRndMbll4TGsxeloxTjNZWEFTUUFvTFkyOXpiVzl6TVhSbGMzUVNFd29GZFhWelpHTVNDak16TXpNd01EQXdNREFhQnhJRmRYVnpaRzRpRXdvRmRYVnpaRzRTQ2pNek16TXdNREF3TURBS1Bnb2ZMMjV2WW14bExtUnZiR3hoY2k1MllYVnNkSE11ZGpFdVRYTm5URzlqYXhJYkNndGpiM050YjNNeGRHVnpkQkFCR2dvek16TXpNREF3TURBdyIsIm1lbW8iOiIifQ==',
    ack: buildMsgResponseString(MsgLockResponse, {}),
  },
};

const deploy = async (t: ExecutionContext) => {
  const common = await commonSetup(t);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const { usdc } = common.brands;
  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {}, // terms
    common.commonPrivateArgs,
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
  t.log('I am a power user with', myBalance, 'on Agoric');

  const { ibcBridge } = common.mocks;
  for (const { msg, ack } of Object.values(protoMsgMocks)) {
    ibcBridge.addMockAck(msg, ack);
  }

  const openPortfolio = async (
    instance: Instance<StartFn>,
    wallet: WalletTool,
    give: Partial<Record<YieldProtocol, Amount<'nat'>>>,
  ) => {
    const invitationSpec = {
      source: 'contract' as const,
      instance,
      publicInvitationMaker: 'makeOpenPortfolioInvitation' as const,
    };
    t.log('I ask the portfolio manager to allocate', give);
    const proposal = { give };
    return wallet.executeOffer({ id: 'open123', invitationSpec, proposal });
  };

  const give = {
    USDN: usdc.units(3_333),
    Aave: usdc.units(3_333),
    Compound: usdc.units(3_333),
  };
  const done = await openPortfolio(started.instance, myWallet, give);
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
