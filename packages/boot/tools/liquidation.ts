import type { ExecutionContext } from 'ava';

import {
  insistManagerType,
  makeSwingsetHarness,
} from '@aglocal/boot/tools/supports.js';
import {
  type GovernanceDriver,
  type PriceFeedDriver,
  type WalletFactoryDriver,
  adaptCosmicSwingsetTestKitForDriver,
  makeGovernanceDriver,
  makePriceFeedDriver,
  makeWalletFactoryDriver,
} from '@aglocal/boot/tools/drivers.js';
import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import {
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import {
  type FakeStorageKit,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { makeSlogSender } from '@agoric/telemetry';
import {
  type AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import { Fail } from '@endo/errors';

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

export const scale6 = (x: number) => BigInt(Math.round(x * 1_000_000));

const DebtLimitValue = scale6(100_000);

export const likePayouts = ({ Bid, Collateral }) => ({
  Collateral: {
    value: scale6(Collateral),
  },
  Bid: {
    value: scale6(Bid),
  },
});

export const makeLiquidationTestKit = async ({
  swingsetTestKit,
  agoricNamesRemotes,
  walletFactoryDriver,
  governanceDriver,
  t,
}: {
  swingsetTestKit: Awaited<ReturnType<typeof makeCosmicSwingsetTestKit>>;
  agoricNamesRemotes: AgoricNamesRemotes;
  walletFactoryDriver: WalletFactoryDriver;
  governanceDriver: GovernanceDriver;
  t: Pick<ExecutionContext, 'like'>;
}) => {
  const priceFeedDrivers = {} as Record<string, PriceFeedDriver>;
  const { storage } = swingsetTestKit;

  const readPublished = (subPath: string) =>
    storage.readLatest(`published.${subPath}`);

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
    const { advanceTimeBy } = swingsetTestKit;

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
    t.like(readPublished('auction.governance'), {
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
    vaultNotification(
      managerIndex: number,
      vaultIndex: number,
      partial: Record<string, any>,
    ) {
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

  const placeBids = async (
    collateralBrandKey: string,
    buyerWalletAddress: string,
    setup: LiquidationSetup,
    base = 0, // number of bids made before
  ) => {
    const buyer =
      await walletFactoryDriver.provideSmartWallet(buyerWalletAddress);

    await buyer.sendOffer(
      Offers.psm.swap(
        agoricNamesRemotes,
        agoricNamesRemotes.instance['psm-IST-USDC_axl'],
        {
          offerId: `print-${collateralBrandKey}-ist`,
          wantMinted: 1_000,
          pair: ['IST', 'USDC_axl'],
        },
      ),
    );

    const maxBuy = `10000${collateralBrandKey}`;

    for (let i = 0; i < setup.bids.length; i += 1) {
      const offerId = `${collateralBrandKey}-bid${i + 1 + base}`;
      // bids are long-lasting offers so we can't wait here for completion
      await buyer.sendOfferMaker(Offers.auction.Bid, {
        offerId,
        ...setup.bids[i],
        maxBuy,
      });
      t.like(readPublished(`wallet.${buyerWalletAddress}`), {
        status: {
          id: offerId,
          result: 'Your bid has been accepted',
          payouts: undefined,
        },
      });
    }
  };

  return {
    check,
    priceFeedDrivers,
    setupVaults,
    placeBids,
  };
};

// asserts x is type doesn't work when using arrow functions
// https://github.com/microsoft/TypeScript/issues/34523
function assertManagerType(specimen: string): asserts specimen is ManagerType {
  insistManagerType(specimen);
}

export const makeLiquidationTestContext = async (
  parameters: Parameters<typeof makeCosmicSwingsetTestKit>[0] &
    Partial<{ storage: FakeStorageKit }>,
  t: Pick<ExecutionContext, 'like'>,
) => {
  let handleBridgeSend = parameters.handleBridgeSend;
  let storage = parameters.storage;
  const {
    SLOGFILE: slogFile,
    SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
  } = process.env;

  assertManagerType(defaultManagerType);

  if (!storage) storage = makeFakeStorageKit('bootstrapTests');

  if (!handleBridgeSend)
    ({ handleBridgeSend } = makeMockBridgeKit({ storageKit: storage }));

  const harness =
    defaultManagerType === 'xsnap' ? makeSwingsetHarness() : undefined;
  const slogSender = slogFile
    ? makeSlogSender({
        env: {
          ...process.env,
          SLOGFILE: slogFile,
        },
        stateDir: '.',
      })
    : undefined;

  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    ...parameters,
    handleBridgeSend,
    slogSender,
  });
  console.time('DefaultTestContext');

  const { EV, queueAndRun } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');

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
    { EV, queueAndRun },
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  const governanceDriver = await makeGovernanceDriver(
    adaptCosmicSwingsetTestKitForDriver(storage, swingsetTestKit),
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
    agoricNamesRemotes,
    governanceDriver,
    swingsetTestKit,
    walletFactoryDriver,
    t,
  });
  return {
    agoricNamesRemotes,
    governanceDriver,
    harness,
    liquidationTestKit,
    refreshAgoricNamesRemotes,
    storage,
    swingsetTestKit,
    walletFactoryDriver,
  };
};

export type LiquidationTestContext = Awaited<
  ReturnType<typeof makeLiquidationTestContext>
>;

const addSTARsCollateral = async (
  t: ExecutionContext<LiquidationTestContext>,
) => {
  const {
    refreshAgoricNamesRemotes,
    swingsetTestKit: { evaluateCoreProposal },
  } = t.context;

  await evaluateCoreProposal(
    await buildProposal('@agoric/builders/scripts/inter-protocol/add-STARS.js'),
  );

  refreshAgoricNamesRemotes();

  console.log('add-STARS proposal executed');
};

export const ensureVaultCollateral = async (
  collateralBrandKey: string,
  t: ExecutionContext<LiquidationTestContext>,
) => {
  await null;

  // TODO: we'd like to have this work on any brand
  const SUPPORTED_BRANDS = ['ATOM', 'STARS'];

  if (!SUPPORTED_BRANDS.includes(collateralBrandKey))
    throw Error('Unsupported brand type');

  if (collateralBrandKey === 'ATOM') return;

  if (collateralBrandKey === 'STARS') await addSTARsCollateral(t);
};
