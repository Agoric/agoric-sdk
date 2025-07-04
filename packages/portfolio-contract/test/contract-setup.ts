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
import { contractAddressesMock, makeUSDNIBCTraffic } from './mocks.ts';
import { makeTrader } from './portfolio-actors.ts';
import {
  chainInfoFantasyTODO,
  makeIncomingEVMEvent,
  setupPortfolioTest,
} from './supports.ts';
import { makeWallet } from './wallet-offer-tools.ts';
import type { SmartWalletKit, VstorageKit } from '@agoric/client-utils';

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

  const { usdc, poc26 } = common.brands;
  const timerService = buildZoeManualTimer();

  const selectedChains = [
    'agoric',
    'noble',
    'axelar',
    'osmosis',
    'Polygon',
    'optimism',
    'Fantom',
    'binance',
    'Avalanche',
    'arbitrum',
    'Ethereum',
    'polygon-sepolia',
    'optimism-sepolia',
    'ethereum-sepolia',
    'arbitrum-sepolia',
  ];

  const chainInfo = Object.fromEntries(
    selectedChains.map(name => [name, chainInfoFantasyTODO[name]]),
  );

  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer, Access: poc26.issuer },
    {}, // terms
    {
      ...common.commonPrivateArgs,
      contractAddresses: contractAddressesMock,
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
  const { usdc, poc26 } = common.brands;
  const { when } = common.utils.vowTools;

  const { storage } = common.bootstrap;
  const readPublished = (async subpath => {
    const val = storage.getDeserialized(`orchtest.${subpath}`).at(-1);
    return val;
  }) as unknown as VstorageKit['readPublished'];
  const myBalance = usdc.units(initial);
  const funds = await common.utils.pourPayment(myBalance);
  const { mint: _, ...poc26SansMint } = poc26;
  const myWallet = makeWallet({ USDC: usdc, Access: poc26SansMint }, zoe, when);
  await E(myWallet).deposit(funds);
  await E(myWallet).deposit(poc26.mint.mintPayment(poc26.make(1n)));
  const trader1 = makeTrader(myWallet, started.instance, readPublished);

  const { ibcBridge } = common.mocks;
  for (const { msg, ack } of values(makeUSDNIBCTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }

  return { common, zoe, started, myBalance, myWallet, trader1, timerService };
};

export const simulateUpcallFromAxelar = async (
  transferBridge: ScopedBridgeManager<'vtransfer'>,
) => {
  const event = makeIncomingEVMEvent();
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
