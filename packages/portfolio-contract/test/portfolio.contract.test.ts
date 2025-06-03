// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { createRequire } from 'module';
import { commonSetup } from './supports.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';
import { executeOffer } from './wallet-offer-tools.ts';
import type { VowTools } from '@agoric/vow';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';

const nodeRequire = createRequire(import.meta.url);

const contractName = 'ymax0';
const contractFile = nodeRequire.resolve('../src/portfolio.contract.ts');
type StartFn = typeof import('../src/portfolio.contract.ts').start;

test('start portfolio contract', async t => {
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
  const mockWhen = (x => x) as VowTools['when'];
  const openPortfolio = async (
    instance: Instance<StartFn>,
    funds: Payment<'nat'>,
  ) => {
    const toOpen = await E(myKit.publicFacet).makeOpenPortfolioInvitation();
    t.is(passStyleOf(toOpen), 'remotable');

    const myPurse = await E(usdc.issuer).makeEmptyPurse();
    const In = await E(myPurse).deposit(funds);
    const proposal = { give: { In } };
    const offerSpec = {
      id: 'open123',
      invitationSpec: {
        source: 'contract' as const,
        instance,
        publicInvitationMaker: 'makeOpenPortfolioInvitation',
      },
      proposal,
    };
    const { result, payouts: payoutsP } = await executeOffer(
      zoe,
      mockWhen,
      offerSpec,
      _ => myPurse,
    );
    const payouts = await deeplyFulfilledObject(payoutsP);
    t.log({ result });
    t.log({ payouts });
  };

  const funds = await common.utils.pourPayment(usdc.units(10_000));
  await openPortfolio(myKit.instance, funds);
});
