/* eslint-disable no-lone-blocks, no-await-in-loop */
// @ts-check
/**
 * @file Bootstrap test integration vaults with smart-wallet
 *
 * Forks test-liquidation to test another scenario, but with a clean vault manager state.
 * TODO is there a way to *reset* the vaultmanager to make the two tests run faster?
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail, NonNullish } from '@agoric/assert';
import {
  makeParseAmount,
  Offers,
} from '@agoric/inter-protocol/src/clientSupport.js';
import {
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import {
  makeGovernanceDriver,
  makePriceFeedDriver,
  makeWalletFactoryDriver,
} from './drivers.js';
import { makeSwingsetTestKit } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

//#region Product spec
const setup = /** @type {const} */ ({
  vaults: [
    {
      atom: 15,
      ist: 100,
      debt: 100.5,
    },
    {
      atom: 15,
      ist: 103,
      debt: 103.515,
    },
    {
      atom: 15,
      ist: 105,
      debt: 105.525,
    },
  ],
  bids: [
    {
      give: '75IST',
      discount: 0.22,
    },
    {
      give: '25IST',
      discount: 0.3,
    },
  ],
  price: {
    starting: 12.34,
    trigger: 9.99,
  },
  auction: {
    start: {
      collateral: 45,
      debt: 309.54,
    },
  },
});

const outcome = /** @type {const} */ ({
  bids: [
    {
      payouts: {
        Bid: 0,
        Collateral: 8.897786,
      },
    },
    {
      payouts: {
        Bid: 0,
        Collateral: 10.01001,
      },
    },
    {
      payouts: {
        Bid: 10.46,
        Collateral: 16.432903,
      },
    },
  ],
  reserve: {
    allocations: {
      ATOM: 0.30985,
    },
    shortfall: 5.525,
  },
  vaultsSpec: [
    {
      debt: 100.5,
      locked: 14.899,
    },
    {
      debt: 103.515,
      locked: 14.896,
    },
  ],
  // TODO match spec https://github.com/Agoric/agoric-sdk/issues/7837
  vaultsActual: [
    {
      debt: 100.5,
      locked: 1.4999185,
    },
    {
      debt: 103.515,
      locked: 1.4999161,
    },
    {
      locked: 0,
    },
  ],
});
//#endregion

const scale6 = x => BigInt(Math.round(x * 1_000_000));
const DebtLimitValue = scale6(100_000);

const likePayouts = ({ Bid, Collateral }) => ({
  Collateral: {
    value: scale6(Collateral),
  },
  Bid: {
    value: scale6(Bid),
  },
});

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t, 'bundles/vaults', {
    configSpecifier: '@agoric/vats/decentral-main-vaults-config.json',
  });

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  const governanceDriver = await makeGovernanceDriver(
    swingsetTestKit,
    agoricNamesRemotes,
    walletFactoryDriver,
    // TODO read from the config file
    [
      'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
      'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
      'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
    ],
  );
  console.timeLog('DefaultTestContext', 'governanceDriver');

  const priceFeedDriver = await makePriceFeedDriver(
    storage,
    agoricNamesRemotes,
    walletFactoryDriver,
    // TODO read from the config file
    [
      'agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr',
      'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8',
      'agoric144rrhh4m09mh7aaffhm6xy223ym76gve2x7y78',
      'agoric19d6gnr9fyp6hev4tlrg87zjrzsd5gzr5qlfq2p',
      'agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj',
    ],
  );

  console.timeLog('DefaultTestContext', 'priceFeedDriver');

  console.timeEnd('DefaultTestContext');

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    governanceDriver,
    priceFeedDriver,
    walletFactoryDriver,
  };
};

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

// Reference: Flow 2b from https://github.com/Agoric/agoric-sdk/issues/7123
test.serial('scenario: Flow 2b', async t => {
  const {
    advanceTimeBy,
    advanceTimeTo,
    agoricNamesRemotes,
    governanceDriver,
    priceFeedDriver,
    readLatest,
    walletFactoryDriver,
  } = t.context;

  // price feed logic treats zero time as "unset" so advance to nonzero
  await advanceTimeBy(1, 'seconds');

  await priceFeedDriver.setPrice(12.34);

  // raise the VaultFactory DebtLimit
  await governanceDriver.changeParams(
    agoricNamesRemotes.instance.VaultFactory,
    {
      DebtLimit: {
        brand: agoricNamesRemotes.brand.IST,
        value: DebtLimitValue,
      },
    },
    {
      paramPath: {
        key: {
          collateralBrand: agoricNamesRemotes.brand.ATOM,
        },
      },
    },
  );

  // raise the PSM MintLimit
  await governanceDriver.changeParams(
    agoricNamesRemotes.instance['psm-IST-USDC_axl'],
    {
      MintLimit: {
        brand: agoricNamesRemotes.brand.IST,
        value: DebtLimitValue, // reuse
      },
    },
  );

  // confirm Relevant Governance Parameter Assumptions
  t.like(readLatest('published.vaultFactory.managers.manager0.governance'), {
    current: {
      DebtLimit: { value: { value: DebtLimitValue } },
      InterestRate: {
        type: 'ratio',
        value: { numerator: { value: 1n }, denominator: { value: 100n } },
      },
      LiquidationMargin: {
        type: 'ratio',
        value: { numerator: { value: 150n }, denominator: { value: 100n } },
      },
      LiquidationPadding: {
        type: 'ratio',
        value: { numerator: { value: 25n }, denominator: { value: 100n } },
      },
      LiquidationPenalty: {
        type: 'ratio',
        value: { numerator: { value: 1n }, denominator: { value: 100n } },
      },
      MintFee: {
        type: 'ratio',
        value: { numerator: { value: 50n }, denominator: { value: 10_000n } },
      },
    },
  });
  t.like(readLatest('published.auction.governance'), {
    current: {
      AuctionStartDelay: { type: 'relativeTime', value: { relValue: 2n } },
      ClockStep: {
        type: 'relativeTime',
        value: { relValue: 3n * SECONDS_PER_MINUTE },
      },
      DiscountStep: { type: 'nat', value: 500n }, // 5%
      LowestRate: { type: 'nat', value: 6500n }, // 65%
      PriceLockPeriod: {
        type: 'relativeTime',
        value: { relValue: SECONDS_PER_HOUR / 2n },
      },
      StartFrequency: {
        type: 'relativeTime',
        value: { relValue: SECONDS_PER_HOUR },
      },
      StartingRate: { type: 'nat', value: 10500n }, // 105%
    },
  });

  const minter = await walletFactoryDriver.provideSmartWallet('agoric1minter');

  for (let i = 0; i < setup.vaults.length; i += 1) {
    const offerId = `open-vault${i}`;
    await minter.executeOfferMaker(Offers.vaults.OpenVault, {
      offerId,
      collateralBrandKey,
      wantMinted: setup.vaults[i].ist,
      giveCollateral: setup.vaults[i].atom,
    });
    t.like(minter.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: { id: offerId, numWantsSatisfied: 1 },
    });
  }

  // Verify starting balances
  t.like(readLatest('published.vaultFactory.managers.manager0.vaults.vault0'), {
    debtSnapshot: { debt: { value: scale6(setup.vaults[0].debt) } },
    locked: { value: scale6(setup.vaults[0].atom) },
    vaultState: 'active',
  });
  t.like(readLatest('published.vaultFactory.managers.manager0.vaults.vault1'), {
    debtSnapshot: { debt: { value: scale6(setup.vaults[1].debt) } },
    locked: { value: scale6(setup.vaults[1].atom) },
    vaultState: 'active',
  });
  t.like(readLatest('published.vaultFactory.managers.manager0.vaults.vault2'), {
    debtSnapshot: { debt: { value: scale6(setup.vaults[2].debt) } },
    locked: { value: scale6(setup.vaults[2].atom) },
    vaultState: 'active',
  });

  const buyer = await walletFactoryDriver.provideSmartWallet('agoric1buyer');
  {
    // ---------------
    //  Place bids
    // ---------------

    const parseAmount = makeParseAmount(agoricNamesRemotes, Error);
    await buyer.sendOffer(
      Offers.psm.swap(
        agoricNamesRemotes.instance['psm-IST-USDC_axl'],
        agoricNamesRemotes.brand,
        {
          offerId: 'print-ist',
          wantMinted: 1_000,
          pair: ['IST', 'USDC_axl'],
        },
      ),
    );

    const maxBuy = '10000ATOM';

    // bids are long-lasting offers so we can't wait here for completion
    await buyer.sendOfferMaker(Offers.auction.Bid, {
      offerId: 'bid1',
      ...setup.bids[0],
      maxBuy,
      parseAmount,
    });

    t.like(readLatest('published.wallet.agoric1buyer'), {
      status: {
        id: 'bid1',
        result: 'Your bid has been accepted',
        payouts: undefined,
      },
    });
    await buyer.sendOfferMaker(Offers.auction.Bid, {
      offerId: 'bid2',
      ...setup.bids[1],
      maxBuy,
      parseAmount,
    });
    t.like(readLatest('published.wallet.agoric1buyer'), {
      status: {
        id: 'bid2',
        result: 'Your bid has been accepted',
        payouts: undefined,
      },
    });
  }

  {
    // ---------------
    //  Change price to trigger liquidation
    // ---------------

    await priceFeedDriver.setPrice(9.99);

    // check nothing liquidating yet
    /** @type {import('@agoric/inter-protocol/src/auction/scheduler.js').ScheduleNotification} */
    const liveSchedule = readLatest('published.auction.schedule');
    t.is(liveSchedule.activeStartTime, null);
    t.like(readLatest('published.vaultFactory.managers.manager0.metrics'), {
      numActiveVaults: setup.vaults.length,
      numLiquidatingVaults: 0,
    });

    // advance time to start an auction
    console.log('step 0 of 10');
    await advanceTimeTo(NonNullish(liveSchedule.nextDescendingStepTime));
    t.like(readLatest('published.vaultFactory.managers.manager0.metrics'), {
      numActiveVaults: 0,
      numLiquidatingVaults: setup.vaults.length,
      liquidatingCollateral: {
        value: scale6(setup.auction.start.collateral),
      },
      liquidatingDebt: { value: scale6(setup.auction.start.debt) },
    });

    console.log('step 1 of 10');
    await advanceTimeBy(3, 'minutes');
    t.like(readLatest('published.auction.book0'), {
      collateralAvailable: { value: scale6(setup.auction.start.collateral) },
      startCollateral: { value: scale6(setup.auction.start.collateral) },
      startProceedsGoal: { value: scale6(setup.auction.start.debt) },
    });

    // DEBUG 7850
    await priceFeedDriver.setPrice(13); // back above water

    console.log('step 2 of 10');
    await advanceTimeBy(3, 'minutes');

    console.log('step 3 of 10');
    await advanceTimeBy(3, 'minutes');
    // XXX updates for bid1 and bid2 are appended in the same turn so readLatest gives bid2
    // NB: console output shows 8897786n payout which matches spec 8.897ATOM
    // t.like(readLatest('published.wallet.agoric1buyer'), {
    //   status: {
    //     id: 'bid1',
    //     payouts: {
    //       Bid: { value: 0n },
    //       Collateral: { value: scale6(outcome.bids[0].payouts.Collateral) },
    //     },
    //   },
    // });

    // t.like(readLatest('published.wallet.agoric1buyer'), {
    //   status: {
    //     id: 'bid2',
    //     payouts: likePayouts(outcome.bids[1].payouts),
    //   },
    // });

    console.log('step 4 of 10');
    await advanceTimeBy(3, 'minutes');

    // DEBUG 7850
    await priceFeedDriver.setPrice(1); // down low

    console.log('step 5 of 10');
    await advanceTimeBy(3, 'minutes');
    // t.like(readLatest('published.auction.book0'), {
    //   collateralAvailable: { value: 9659301n },
    // });

    // DEBUG 7850
    await priceFeedDriver.setPrice(14); // back up

    console.log('step 6 of 10');
    await advanceTimeBy(3, 'minutes');

    console.log('step 7 of 10');
    await advanceTimeBy(3, 'minutes');

    console.log('step 8 of 10');
    await advanceTimeBy(3, 'minutes');
    t.like(readLatest('published.vaultFactory.managers.manager0.metrics'), {
      // reconstituted
      numActiveVaults: 2,
      numLiquidationsCompleted: 1,
      numLiquidatingVaults: 0,
      retainedCollateral: { value: 0n },
      // totalCollateral: { value: 29834673n },
      totalCollateralSold: { value: 13585013n },
      totalDebt: { value: 204015000n },
      totalOverageReceived: { value: 0n },
      totalProceedsReceived: { value: 100000000n },
      totalShortfallReceived: { value: 5525000n },
    });

    console.log('step 9 of 10');
    await advanceTimeBy(3, 'minutes');

    console.log('step 10 of 10');
    await advanceTimeBy(3, 'minutes');

    console.log('step 11 of 10');
    await advanceTimeBy(3, 'minutes');

    // check vault balances
    t.like(
      readLatest('published.vaultFactory.managers.manager0.vaults.vault0'),
      {
        debt: undefined,
        vaultState: 'active',
        // locked: {
        //   value:
        //     14999185n /* precision loss scale6(outcome.vaultsActual[0].locked)*/,
        // },
      },
    );
    t.like(
      readLatest('published.vaultFactory.managers.manager0.vaults.vault1'),
      {
        debt: undefined,
        vaultState: 'active',
        // locked: {
        //   value: 14999161n /* scale6(outcome.vaultsActual[1].locked) */,
        // },
      },
    );
    t.like(
      readLatest('published.vaultFactory.managers.manager0.vaults.vault2'),
      {
        debt: undefined,
        vaultState: 'liquidated',
        // locked: { value: scale6(outcome.vaultsActual[2].locked) },
      },
    );
  }

  // check reserve balances
  // t.like(readLatest('published.reserve.metrics'), {
  //   allocations: {
  //     ATOM: { value: scale6(outcome.reserve.allocations.ATOM) },
  //   },
  //   shortfallBalance: { value: scale6(outcome.reserve.shortfall) },
  // });

  // t.like(readLatest('published.vaultFactory.managers.manager0.metrics'), {
  //   // reconstituted
  //   numActiveVaults: 2,
  //   numLiquidationsCompleted: 1,
  //   numLiquidatingVaults: 0,
  //   retainedCollateral: { value: 0n },
  //   totalCollateral: { value: 29834673n },
  //   totalCollateralSold: { value: 13585013n },
  //   totalDebt: { value: 204015000n },
  //   totalOverageReceived: { value: 0n },
  //   totalProceedsReceived: { value: 100000000n },
  //   totalShortfallReceived: { value: scale6(5.525) },
  // });
});
