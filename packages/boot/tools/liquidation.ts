import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import type { ManagerType } from '@agoric/swingset-vat';
import {
  type AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import { Fail } from '@endo/errors';
import type { ExecutionContext } from 'ava';
import {
  type GovernanceDriver,
  type PriceFeedDriver,
  type WalletFactoryDriver,
  makeGovernanceDriver,
  makePriceFeedDriver,
  makeWalletFactoryDriver,
} from './drivers.js';
import {
  type SwingsetTestKit,
  insistManagerType,
  makeSwingsetHarness,
  makeSwingsetTestKit,
} from './supports.js';

export type LiquidationSetup = {
  vaults: {
    atom: number;
    ist: number;
    debt: number;
  }[];
  bids: (
    | {
        give: string;
        discount: number;
        price?: undefined;
      }
    | {
        give: string;
        price: number;
        discount?: undefined;
      }
  )[];
  price: {
    starting: number;
    trigger: number;
  };
  auction: {
    start: {
      collateral: number;
      debt: number;
    };
    end: {
      collateral: number;
      debt: number;
    };
  };
};

// TODO read from the config file
export const atomConfig = {
  oracleAddresses: [
    'agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr',
    'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8',
    'agoric144rrhh4m09mh7aaffhm6xy223ym76gve2x7y78',
    'agoric19d6gnr9fyp6hev4tlrg87zjrzsd5gzr5qlfq2p',
    'agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj',
  ],
};

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

/**
 * @deprecated liquidation is no longer supported
 */
export const makeLiquidationTestKit = async ({
  swingsetTestKit,
  agoricNamesRemotes,
  walletFactoryDriver,
  governanceDriver,
  t,
}: {
  swingsetTestKit: SwingsetTestKit;
  agoricNamesRemotes: AgoricNamesRemotes;
  walletFactoryDriver: WalletFactoryDriver;
  governanceDriver: GovernanceDriver;
  t: Pick<ExecutionContext, 'like'>;
}) => {
  const priceFeedDrivers = {} as Record<string, PriceFeedDriver>;

  console.timeLog('DefaultTestContext', 'priceFeedDriver');

  console.timeEnd('DefaultTestContext');

  const setupStartingState = async ({
    collateralBrandKey,
    managerIndex,
    price,
  }: {
    collateralBrandKey: string;
    managerIndex: number;
    price: number;
  }) => {
    const managerPath = `vaultFactory.managers.manager${managerIndex}`;
    const { advanceTimeBy, readPublished } = swingsetTestKit;

    await null;
    if (!priceFeedDrivers[collateralBrandKey]) {
      priceFeedDrivers[collateralBrandKey] = await makePriceFeedDriver(
        collateralBrandKey,
        agoricNamesRemotes,
        walletFactoryDriver,
        atomConfig.oracleAddresses,
      );
    }

    // price feed logic treats zero time as "unset" so advance to nonzero
    await advanceTimeBy(1, 'seconds');

    await priceFeedDrivers[collateralBrandKey].setPrice(price);

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
    t.like(readPublished(`${managerPath}.governance`), {
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
  };

  const check = {
    vaultNotification(
      managerIndex: number,
      vaultIndex: number,
      partial: Record<string, any>,
    ) {
      const { readPublished } = swingsetTestKit;

      const notification = readPublished(
        `vaultFactory.managers.manager${managerIndex}.vaults.vault${vaultIndex}`,
      );
      t.like(notification, partial);
    },
  };

  const setupVaults = async (
    collateralBrandKey: string,
    managerIndex: number,
    setup: LiquidationSetup,
    base: number = 0,
  ) => {
    await setupStartingState({
      collateralBrandKey,
      managerIndex,
      price: setup.price.starting,
    });

    const minter =
      await walletFactoryDriver.provideSmartWallet('agoric1minter');

    for (let i = 0; i < setup.vaults.length; i += 1) {
      const offerId = `open-${collateralBrandKey}-vault${base + i}`;
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
    for (let i = 0; i < setup.vaults.length; i += 1) {
      check.vaultNotification(managerIndex, i, {
        debtSnapshot: {
          debt: { value: scale6(setup.vaults[i].debt) },
        },
        locked: { value: scale6(setup.vaults[i].atom) },
        vaultState: 'active',
      });
    }
  };

  return {
    check,
    priceFeedDrivers,
    setupVaults,
  };
};

// asserts x is type doesn't work when using arrow functions
// https://github.com/microsoft/TypeScript/issues/34523
function assertManagerType(specimen: string): asserts specimen is ManagerType {
  insistManagerType(specimen);
}

// Requires an explicit return type because of: error TS2742: The inferred type of 'makeLiquidationTestContext' cannot be named without a reference to '../../../node_modules/@endo/eventual-send/src/E.js'. This is likely not portable. A type annotation is necessary.
// But since it's deprecated don't bother to define one.
/**
 * @deprecated liquidation is no longer supported
 */
export const makeLiquidationTestContext = async (
  t: ExecutionContext,
  io: { env?: Record<string, string | undefined> } = {},
): Promise<any> => {
  const { env = {} } = io;
  const {
    SLOGFILE: slogFile,
    SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
  } = env;
  assertManagerType(defaultManagerType);
  const harness =
    defaultManagerType === 'xsnap' ? makeSwingsetHarness() : undefined;
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    slogFile,
    defaultManagerType,
    harness,
  });
  console.time('DefaultTestContext');

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes: AgoricNamesRemotes =
    makeAgoricNamesRemotesFromFakeStorage(storage);
  const refreshAgoricNamesRemotes = () => {
    Object.assign(
      agoricNamesRemotes,
      makeAgoricNamesRemotesFromFakeStorage(storage),
    );
  };
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
      'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
      'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
      'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    ],
  );
  console.timeLog('DefaultTestContext', 'governanceDriver');

  const liquidationTestKit = await makeLiquidationTestKit({
    swingsetTestKit,
    agoricNamesRemotes,
    walletFactoryDriver,
    governanceDriver,
    t,
  });
  return {
    ...swingsetTestKit,
    ...liquidationTestKit,
    agoricNamesRemotes,
    refreshAgoricNamesRemotes,
    walletFactoryDriver,
    governanceDriver,
    harness,
  };
};

export type LiquidationTestContext = Awaited<
  ReturnType<typeof makeLiquidationTestContext>
>;
