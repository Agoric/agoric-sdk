import { mustMatch } from '@agoric/internal';
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
import { setupPortfolioTest } from './supports.ts';
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
  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    {}, // terms
    // @ts-expect-error XXX what's up with chainInfo type???
    {
      ...common.commonPrivateArgs,
      contractAddresses,
      axelarChainsMap,
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
