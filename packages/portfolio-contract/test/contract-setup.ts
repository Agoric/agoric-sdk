import { mustMatch } from '@agoric/internal';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ScopedBridgeManager } from '@agoric/vats';
import { heapVowE as VE } from '@agoric/vow';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { passStyleOf } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import * as contractExports from '../src/portfolio.contract.ts';
import {
  axelarChainsMap,
  contractAddresses,
  makeUSDNIBCTraffic,
} from './mocks.ts';
import { makeTrader } from './portfolio-actors.ts';
import { localAccount0 } from './mocks.ts';
import {
  chainInfoFantasyTODO,
  makeIncomingEvent,
  setupPortfolioTest,
} from './supports.ts';
import { makeWallet } from './wallet-offer-tools.ts';

const contractName = 'ymax0';
type StartFn = typeof contractExports.start;

export const deploy = async (t: ExecutionContext) => {
  const common = await setupPortfolioTest(t);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);
  t.is(passStyleOf(installation), 'remotable');

  const { usdc } = common.brands;
  const { agoric, noble, axelar, osmosis } = chainInfoFantasyTODO;
  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {}, // terms
    {
      ...common.commonPrivateArgs,
      contractAddresses,
      axelarChainsMap,
      chainInfo: { agoric, noble, axelar, osmosis },
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

export const setupTrader = async (t, initial = 10_000) => {
  const { common, zoe, started } = await deploy(t);
  const { usdc } = common.brands;
  const { when } = common.utils.vowTools;

  const { ibcBridge } = common.mocks;
  for (const { msg, ack } of Object.values(makeUSDNIBCTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }

  const myBalance = usdc.units(initial);
  const funds = await common.utils.pourPayment(myBalance);
  const myWallet = makeWallet({ USDC: usdc }, zoe, when);
  await E(myWallet).deposit(funds);
  const trader1 = makeTrader(myWallet, started.instance);
  return { common, zoe, started, myBalance, myWallet, trader1 };
};

export const simulateUpcallFromAxelar = async (
  transferBridge: ScopedBridgeManager<'vtransfer'>,
) => {
  const event = makeIncomingEvent(localAccount0, 'Base');
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
