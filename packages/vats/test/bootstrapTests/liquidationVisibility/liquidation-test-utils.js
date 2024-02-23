/* eslint-disable no-lone-blocks, no-await-in-loop */
// @ts-check
/**
 * @file Bootstrap test vaults liquidation visibility
 */
import * as processAmbient from 'child_process';
import * as fsAmbient from 'fs';
import { Fail } from '@agoric/assert';
import { NonNullish } from '@agoric/assert/src/assert.js';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { TimeMath } from '@agoric/time';
import { scale6 } from '../liquidation.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../../tools/board-utils.js';
import { makeSwingsetTestKit } from '../supports.js';
import {
  makeGovernanceDriver,
  makePriceFeedDriver,
  makeWalletFactoryDriver,
} from '../drivers.js';

const PLATFORM_CONFIG =
  '@agoric/vats/test/bootstrapTests/liquidationVisibility/vaults-liquidation-config.json';

const DebtLimitValue = scale6(100_000);

//#region Product spec
const setup = /** @type {const} */ ({
  // Vaults are sorted in the worst debt/col ratio to the best
  vaults: [
    {
      atom: 15,
      ist: 105,
      debt: 105.525,
    },
    {
      atom: 15,
      ist: 103,
      debt: 103.515,
    },
    {
      atom: 15,
      ist: 100,
      debt: 100.5,
    },
  ],
  bids: [
    {
      give: '80IST',
      discount: 0.1,
    },
    {
      give: '90IST',
      price: 9.0,
    },
    {
      give: '150IST',
      discount: 0.15,
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
    end: {
      collateral: 9.659301,
      debt: 0,
    },
  },
});

const outcome = /** @type {const} */ ({
  reserve: {
    allocations: {
      ATOM: 0.309852,
      STARS: 0.309852,
    },
    shortfall: 0,
  },
  // The order in the setup preserved
  vaults: [
    {
      locked: 2.846403,
    },
    {
      locked: 3.0779,
    },
    {
      locked: 3.425146,
    },
  ],
});
//#endregion

const placeBids = async (
  t,
  collateralBrandKey,
  buyerWalletAddress,
  base = 0, // number of bids made before
) => {
  const { agoricNamesRemotes, walletFactoryDriver, readLatest } = t.context;

  const buyer = await walletFactoryDriver.provideSmartWallet(
    buyerWalletAddress,
  );

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
    t.like(readLatest(`published.wallet.${buyerWalletAddress}`), {
      status: {
        id: offerId,
        result: 'Your bid has been accepted',
        payouts: undefined,
      },
    });
  }
};

const runAuction = async (runUtils, advanceTimeBy) => {
  const { EV } = runUtils;
  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const { liveAuctionSchedule } = await EV(
    auctioneerKit.publicFacet,
  ).getSchedules();

  await advanceTimeBy(3 * Number(liveAuctionSchedule.steps), 'minutes');

  return liveAuctionSchedule;
};

const startAuction = async t => {
  const { readLatest, advanceTimeTo } = t.context;

  const scheduleNotification = readLatest('published.auction.schedule');

  await advanceTimeTo(NonNullish(scheduleNotification.nextStartTime));
};

const addNewVaults = async ({ t, collateralBrandKey, base = 0 }) => {
  const { walletFactoryDriver, priceFeedDriver, advanceTimeBy } = t.context;
  await advanceTimeBy(1, 'seconds');

  await priceFeedDriver.setPrice(setup.price.starting);
  const minter = await walletFactoryDriver.provideSmartWallet('agoric1minter');

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

  await placeBids(t, collateralBrandKey, 'agoric1buyer', base);
  await priceFeedDriver.setPrice(setup.price.trigger);
  await startAuction(t);
};

export const checkVisibility = async ({
  t,
  managerIndex,
  collateralBrandKey,
  base = 0,
}) => {
  const { readLatest, advanceTimeBy, runUtils } = t.context;

  await addNewVaults({ t, collateralBrandKey, base });

  const { startTime, startDelay, endTime } = await runAuction(
    runUtils,
    advanceTimeBy,
  );

  const nominalStart = TimeMath.subtractAbsRel(
    startTime.absValue,
    startDelay.relValue,
  );
  t.log(nominalStart);

  const visibilityPath = `published.vaultFactory.managers.manager${managerIndex}.liquidations.${nominalStart.toString()}`;
  const preAuction = readLatest(`${visibilityPath}.vaults.preAuction`);
  const postAuction = readLatest(`${visibilityPath}.vaults.postAuction`);
  const auctionResult = readLatest(`${visibilityPath}.auctionResult`);

  const expectedPreAuction = [];
  for (let i = 0; i < setup.vaults.length; i += 1) {
    expectedPreAuction.push([
      `vault${base + i}`,
      {
        collateralAmount: { value: scale6(setup.vaults[i].atom) },
        debtAmount: { value: scale6(setup.vaults[i].debt) },
      },
    ]);
  }
  t.like(
    Object.fromEntries(preAuction),
    Object.fromEntries(expectedPreAuction),
  );

  const expectedPostAuction = [];
  // Iterate from the end because we expect the post auction vaults
  // in best to worst order.
  for (let i = outcome.vaults.length - 1; i >= 0; i -= 1) {
    expectedPostAuction.push([
      `vault${base + i}`,
      { Collateral: { value: scale6(outcome.vaults[i].locked) } },
    ]);
  }
  t.like(
    Object.fromEntries(postAuction),
    Object.fromEntries(expectedPostAuction),
  );

  t.like(auctionResult, {
    collateralOffered: { value: scale6(setup.auction.start.collateral) },
    istTarget: { value: scale6(setup.auction.start.debt) },
    collateralForReserve: { value: scale6(outcome.reserve.allocations.ATOM) },
    shortfallToReserve: { value: 0n },
    mintedProceeds: { value: scale6(setup.auction.start.debt) },
    collateralSold: {
      value:
        scale6(setup.auction.start.collateral) -
        scale6(setup.auction.end.collateral),
    },
    collateralRemaining: { value: 0n },
    endTime: { absValue: endTime.absValue },
  });

  t.log('preAuction', preAuction);
  t.log('postAuction', postAuction);
  t.log('auctionResult', auctionResult);
};

export const checkVMChildNodes = async ({
  t,
  managerIndex,
  collateralBrandKey,
  liquidation,
  base = 0,
}) => {
  const { storage, advanceTimeBy, runUtils } = t.context;

  await addNewVaults({ t, collateralBrandKey, base });
  await runAuction(runUtils, advanceTimeBy);

  const managerPath = `published.vaultFactory.managers.manager${managerIndex}`;
  const childNodes = storage.toStorage({
    method: 'children',
    args: [`${managerPath}`],
  });
  t.log('VaultManager child nodes: ', childNodes);

  let expectedChildNodes = ['governance', 'metrics', 'quotes', 'vaults'];
  if (liquidation) {
    expectedChildNodes = [...expectedChildNodes, 'liquidations'];
  }

  t.deepEqual(childNodes, expectedChildNodes);
};

/**
 * @param {object} powers
 * @param {Pick<typeof import('node:child_process'), 'execFileSync' >} powers.childProcess
 * @param {typeof import('node:fs/promises')} powers.fs
 */
const makeProposalExtractor = ({ childProcess, fs }) => {
  const getPkgPath = (pkg, fileName = '') =>
    new URL(`../../../../${pkg}/${fileName}`, import.meta.url).pathname;

  const runPackageScript = async (pkg, name, env) => {
    console.warn(pkg, 'running package script:', name);
    const pkgPath = getPkgPath(pkg);
    return childProcess.execFileSync('yarn', ['run', name], {
      cwd: pkgPath,
      env,
    });
  };

  const loadJSON = async filePath =>
    harden(JSON.parse(await fs.readFile(filePath, 'utf8')));

  // XXX parses the output to find the files but could write them to a path that can be traversed
  /** @param {string} txt */
  const parseProposalParts = txt => {
    const evals = [
      ...txt.matchAll(/swingset-core-eval (?<permit>\S+) (?<script>\S+)/g),
    ].map(m => {
      if (!m.groups) throw Fail`Invalid proposal output ${m[0]}`;
      const { permit, script } = m.groups;
      return { permit, script };
    });
    evals.length ||
      Fail`No swingset-core-eval found in proposal output: ${txt}`;

    const bundles = [
      ...txt.matchAll(/swingset install-bundle @([^\n]+)/gm),
    ].map(([, bundle]) => bundle);
    bundles.length || Fail`No bundles found in proposal output: ${txt}`;

    return { evals, bundles };
  };

  /**
   * @param {object} options
   * @param {string} options.package
   * @param {string} options.packageScriptName
   * @param {Record<string, string>} [options.env]
   */
  const buildAndExtract = async ({
    package: packageName,
    packageScriptName,
    env = {},
  }) => {
    const scriptEnv = Object.assign(Object.create(process.env), env);
    // XXX use '@agoric/inter-protocol'?
    const out = await runPackageScript(
      packageName,
      packageScriptName,
      scriptEnv,
    );
    const built = parseProposalParts(out.toString());

    const loadAndRmPkgFile = async fileName => {
      const filePath = getPkgPath(packageName, fileName);
      const content = await fs.readFile(filePath, 'utf8');
      await fs.rm(filePath);
      return content;
    };

    const evalsP = Promise.all(
      built.evals.map(async ({ permit, script }) => {
        const [permits, code] = await Promise.all([
          loadAndRmPkgFile(permit),
          loadAndRmPkgFile(script),
        ]);
        return { json_permits: permits, js_code: code };
      }),
    );

    const bundlesP = Promise.all(
      built.bundles.map(
        async bundleFile =>
          /** @type {Promise<EndoZipBase64Bundle>} */ (loadJSON(bundleFile)),
      ),
    );
    return Promise.all([evalsP, bundlesP]).then(([evals, bundles]) => ({
      evals,
      bundles,
    }));
  };
  return buildAndExtract;
};

export const makeTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t, 'bundles/vaults', {
    configSpecifier: PLATFORM_CONFIG,
  });

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  await eventLoopIteration();

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.ATOM || Fail`ATOM brand not yet defined`;
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

  const setupStartingState = async () => {
    const { advanceTimeBy, readLatest } = swingsetTestKit;
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
  };

  const check = {
    vaultNotification(vaultIndex, partial) {
      const { readLatest } = swingsetTestKit;

      const notification = readLatest(
        `published.vaultFactory.managers.manager0.vaults.vault${vaultIndex}`,
      );
      t.like(notification, partial);
    },
  };

  console.timeEnd('DefaultTestContext');

  const buildProposal = makeProposalExtractor({
    childProcess: processAmbient,
    fs: fsAmbient.promises,
  });

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    check,
    governanceDriver,
    priceFeedDriver,
    setupStartingState,
    walletFactoryDriver,
    buildProposal,
  };
};
