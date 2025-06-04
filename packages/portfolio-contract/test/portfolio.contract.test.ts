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
import { deeplyFulfilledObject } from '@agoric/internal';
import {
  buildMsgResponseString,
  buildTxPacketString,
} from '@agoric/orchestration/tools/ibc-mocks.ts';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { createRequire } from 'module';
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

const [signer, tenk] = ['cosmos1test', `${10_000 * 1_000_000}`];

const protoMsgMocks = {
  swap: {
    msg: buildTxPacketString([
      MsgSwap.toProtoMsg({
        signer,
        amount: { denom: 'uusdc', amount: tenk },
        routes: [{ poolId: 0n, denomTo: 'uusdn' }],
        min: { denom: 'uusdn', amount: tenk },
      }),
    ]),
    ack: buildMsgResponseString(MsgSwapResponse, {}),
  },
  lock: {
    msg: buildTxPacketString([
      MsgLock.toProtoMsg({ signer, vault: 1, amount: tenk }),
    ]),
    ack: buildMsgResponseString(MsgLockResponse, {}),
  },
  lockWorkaround: {
    // vault: 1n???
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2x3S0ZpOXViMkpzWlM1emQyRndMbll4TGsxeloxTjNZWEFTUWdvTFkyOXpiVzl6TVhSbGMzUVNGQW9GZFhWelpHTVNDekV3TURBd01EQXdNREF3R2djU0JYVjFjMlJ1SWhRS0JYVjFjMlJ1RWdzeE1EQXdNREF3TURBd01Bby9DaDh2Ym05aWJHVXVaRzlzYkdGeUxuWmhkV3gwY3k1Mk1TNU5jMmRNYjJOckVod0tDMk52YzIxdmN6RjBaWE4wRUFFYUN6RXdNREF3TURBd01EQXciLCJtZW1vIjoiIn0=',
    ack: buildMsgResponseString(MsgLockResponse, {}),
  },
};

test('start portfolio contract; open portfolio', async t => {
  const common = await commonSetup(t);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const deploy = async () => {
    t.log('contract deployment', contractName);

    const installation: Installation<StartFn> =
      await bundleAndInstall(contractFile);
    t.is(passStyleOf(installation), 'remotable');

    const { usdc } = common.brands;
    return E(zoe).startInstance(
      installation,
      { USDC: usdc.issuer },
      {}, // terms
      common.commonPrivateArgs,
    );
  };
  const myKit = await deploy();
  t.notThrows(() =>
    mustMatch(
      myKit,
      M.splitRecord({
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
        // ...others are not relevant here
      }),
    ),
  );

  const { ibcBridge } = common.mocks;
  for (const { msg, ack } of Object.values(protoMsgMocks)) {
    ibcBridge.addMockAck(msg, ack);
  }

  const { usdc } = common.brands;
  const { when } = common.utils.vowTools;
  const openPortfolio = async (
    instance: Instance<StartFn>,
    wallet: WalletTool,
    funds: Payment<'nat'>,
  ) => {
    const USDN = await E(wallet).deposit(funds);
    const proposal = { give: { USDN } };
    const invitationSpec = {
      source: 'contract' as const,
      instance,
      publicInvitationMaker: 'makeOpenPortfolioInvitation' as const,
    };
    return wallet.executeOffer({ id: 'open123', invitationSpec, proposal });
  };

  const funds = await common.utils.pourPayment(usdc.units(10_000));
  const wallet = makeWallet({ USDC: usdc }, zoe, when);
  const done = await await openPortfolio(myKit.instance, wallet, funds);
  t.log('result', done.result);
  t.log('payouts', await deeplyFulfilledObject(done.payouts));
  t.is(passStyleOf(done.result.invitationMakers), 'remotable');
  t.like(done.result.publicTopics, [
    { description: 'USDN ICA', storagePath: 'cosmos:noble-1:cosmos1test' },
  ]);
});
