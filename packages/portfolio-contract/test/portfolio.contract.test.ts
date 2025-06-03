// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { deeplyFulfilledObject } from '@agoric/internal';
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
