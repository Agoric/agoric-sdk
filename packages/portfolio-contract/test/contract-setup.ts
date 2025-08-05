import type { VstorageKit } from '@agoric/client-utils';
import { mustMatch } from '@agoric/internal';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ScopedBridgeManager } from '@agoric/vats';
import { heapVowE as VE } from '@agoric/vow';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { passStyleOf } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import * as contractExports from '../src/portfolio.contract.ts';
import {
  axelarIdsMock,
  contractsMock,
  gmpAddresses,
  makeCCTPTraffic,
  makeUSDNIBCTraffic,
} from './mocks.ts';
import { makeTrader } from '../tools/portfolio-actors.ts';
import {
  chainInfoWithCCTP,
  makeIncomingEVMEvent,
  setupPortfolioTest,
} from './supports.ts';
import { makeWallet } from '../tools/wallet-offer-tools.ts';

const contractName = 'ymax0';
type StartFn = typeof contractExports.start;
const { values } = Object;

const deploy = async (t: ExecutionContext) => {
  const common = await setupPortfolioTest(t);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);
  t.is(passStyleOf(installation), 'remotable');

  const { usdc, poc26, bld } = common.brands;
  const timerService = buildZoeManualTimer();

  // List of all chains whose `chainInfo` is utilized by the Portfolio contract.
  // Includes both Cosmos-based and EVM-based chains (mainnet and testnet).
  const selectedChains = [
    'agoric',
    'noble',
    'axelar',
    'osmosis',
    'Polygon',
    'Optimism',
    'Fantom',
    'Binance',
    'Avalanche',
    'Arbitrum',
    'Ethereum',
  ];

  const chainInfo = Object.fromEntries(
    selectedChains.map(name => [name, chainInfoWithCCTP[name]]),
  );

  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer, Fee: bld.issuer, Access: poc26.issuer },
    {}, // terms
    {
      ...common.commonPrivateArgs,
      axelarIds: axelarIdsMock,
      contracts: contractsMock,
      gmpAddresses,
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

export const setupTrader = async (t, initial = 10_000) => {
  const { common, zoe, started, timerService } = await deploy(t);
  const { usdc, bld, poc26 } = common.brands;
  const { when } = common.utils.vowTools;

  const { storage } = common.bootstrap;
  const readPublished = (async subpath => {
    await eventLoopIteration();
    const val = storage.getDeserialized(`orchtest.${subpath}`).at(-1);
    return val;
  }) as unknown as VstorageKit['readPublished'];
  const myBalance = usdc.units(initial);
  const funds = await common.utils.pourPayment(myBalance);
  const { mint: _, ...poc26SansMint } = poc26;
  const { mint: _b, ...bldSansMint } = bld;
  const myWallet = makeWallet(
    { USDC: usdc, BLD: bldSansMint, Access: poc26SansMint },
    zoe,
    when,
  );
  await E(myWallet).deposit(funds);
  await E(myWallet).deposit(poc26.mint.mintPayment(poc26.make(1n)));
  await E(myWallet).deposit(bld.mint.mintPayment(bld.make(10_000n)));
  const trader1 = makeTrader(myWallet, started.instance, readPublished);

  const { ibcBridge } = common.mocks;
  for (const { msg, ack } of values(makeUSDNIBCTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }
  for (const { msg, ack } of values(makeCCTPTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }

  return { common, zoe, started, myBalance, myWallet, trader1, timerService };
};

export const simulateUpcallFromAxelar = async (
  transferBridge: ScopedBridgeManager<'vtransfer'>,
  sourceChain: string,
) => {
  const event = makeIncomingEVMEvent({ sourceChain });
  return (
    VE(transferBridge)
      .fromBridge(event)
      // .finally(() => console.debug('fromBridge for tap done'))
      .then(() => eventLoopIteration())
  );
};

export const simulateCCTPAck = async utils => {
  // ack CCTP
  return utils
    .transmitVTransferEvent('acknowledgementPacket', -1)
    .then(() => eventLoopIteration())
    .finally(() => {
      // console.debug('ack CCTP done');
    });
};

// ack IBC transfer to Axelar to open Aave position
export const simulateAckTransferToAxelar = async utils => {
  return utils
    .transmitVTransferEvent('acknowledgementPacket', -1)
    .finally(() => {
      // console.debug('ack Axelar done');
      return;
    });
};
