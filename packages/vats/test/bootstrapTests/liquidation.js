import { Fail } from '@agoric/assert';
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

export const scale6 = x => BigInt(Math.round(x * 1_000_000));

const DebtLimitValue = scale6(100_000);

export const likePayouts = ({ Bid, Collateral }) => ({
  Collateral: {
    value: scale6(Collateral),
  },
  Bid: {
    value: scale6(Bid),
  },
});

export const makeLiquidationTestContext = async t => {
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
  /** @type {import('../../tools/board-utils.js').AgoricNamesRemotes} */
  const agoricNamesRemotes = {};
  const refreshAgoricNamesRemotes = () => {
    Object.assign(
      agoricNamesRemotes,
      makeAgoricNamesRemotesFromFakeStorage(swingsetTestKit.storage),
    );
  };
  refreshAgoricNamesRemotes();
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

  /**
   * @type {Record<
   *   string,
   *   Awaited<ReturnType<typeof makePriceFeedDriver>>
   * >}
   */
  const priceFeedDrivers = {};

  console.timeLog('DefaultTestContext', 'priceFeedDriver');

  console.timeEnd('DefaultTestContext');

  /**
   * @param {object} opts
   * @param {string} opts.collateralBrandKey
   * @param {number} opts.managerIndex
   */
  const setupStartingState = async ({ collateralBrandKey, managerIndex }) => {
    const managerPath = `published.vaultFactory.managers.manager${managerIndex}`;
    const { advanceTimeBy, readLatest } = swingsetTestKit;

    !priceFeedDrivers[collateralBrandKey] ||
      Fail`setup for ${collateralBrandKey} already ran`;
    priceFeedDrivers[collateralBrandKey] = await makePriceFeedDriver(
      collateralBrandKey,
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

    // price feed logic treats zero time as "unset" so advance to nonzero
    await advanceTimeBy(1, 'seconds');

    await priceFeedDrivers[collateralBrandKey].setPrice(12.34);

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
            collateralBrand: agoricNamesRemotes.brand[collateralBrandKey],
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
    t.like(readLatest(`${managerPath}.governance`), {
      current: {
        DebtLimit: { value: { value: DebtLimitValue } },
        StabilityFee: {
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
  };

  const check = {
    /**
     * @param {number} managerIndex
     * @param {number} vaultIndex
     * @param {Record<string, any>} partial
     */
    vaultNotification(managerIndex, vaultIndex, partial) {
      const { readLatest } = swingsetTestKit;

      const notification = readLatest(
        `published.vaultFactory.managers.manager${managerIndex}.vaults.vault${vaultIndex}`,
      );
      t.like(notification, partial);
    },
  };

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    check,
    governanceDriver,
    priceFeedDrivers,
    refreshAgoricNamesRemotes,
    setupStartingState,
    walletFactoryDriver,
  };
};
