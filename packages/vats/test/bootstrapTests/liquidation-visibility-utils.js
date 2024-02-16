/* eslint-disable no-lone-blocks, no-await-in-loop */
// @ts-check
/**
 * @file Bootstrap test vaults liquidation visibility
 */
import { Fail, NonNullish } from '@agoric/assert/src/assert.js';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import * as processAmbient from 'child_process';
import * as fsAmbient from 'fs';
import { TimeMath } from '@agoric/time';
import { scale6 } from './liquidation.js';

const arrayToObject = arr => {
  const obj = {};
  for (let i = 0; i < arr.length; i++) {
    const innerArray = arr[i];
    if (innerArray.length >= 2) {
      const key = innerArray[0];
      const value = innerArray[1];
      obj[key] = value;
    }
  }
  return obj;
};

const placeBids = async (
  t,
  collateralBrandKey,
  buyerWalletAddress,
  setup,
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

const setupVaults = async (
  t,
  collateralBrandKey,
  managerIndex,
  setup,
  base = 0,
) => {
  const { setupStartingState, walletFactoryDriver, check } = t.context;

  await setupStartingState();

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

export const startAuction = async t => {
  const { readLatest, advanceTimeTo } = t.context;

  const scheduleNotification = readLatest('published.auction.schedule');

  await advanceTimeTo(NonNullish(scheduleNotification.nextStartTime));
};

export const addNewVaults = async ({ t, collateralBrandKey, setup, base }) => {
  const { walletFactoryDriver, priceFeedDriver } =
    t.context;

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

  await placeBids(t, collateralBrandKey, 'agoric1buyer', setup, base);
  await priceFeedDriver.setPrice(setup.price.trigger);
  await startAuction(t);
};

export const initVaults = async ({
  t,
  collateralBrandKey,
  managerIndex,
  setup,
}) => {
  const { priceFeedDriver, readLatest } = t.context;

  const metricsPath = `published.vaultFactory.managers.manager${managerIndex}.metrics`;

  await setupVaults(t, collateralBrandKey, managerIndex, setup);
  await placeBids(t, collateralBrandKey, 'agoric1buyer', setup);

  await priceFeedDriver.setPrice(setup.price.trigger);
  await startAuction(t);

  t.like(readLatest(metricsPath), {
    numActiveVaults: 0,
    numLiquidatingVaults: setup.vaults.length,
    liquidatingCollateral: {
      value: scale6(setup.auction.start.collateral),
    },
    liquidatingDebt: { value: scale6(setup.auction.start.debt) },
    lockedQuote: null,
  });
};

export const checkVisibility = async ({
  t,
  managerIndex,
  setupCallback,
  setup,
  outcome,
  base = 0,
}) => {
  const { readLatest, advanceTimeBy, runUtils } = t.context;

  await setupCallback();

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
  t.like(arrayToObject(preAuction), arrayToObject(expectedPreAuction));

  const expectedPostAuction = [];
  // Iterate from the end because we expect the post auction vaults
  // in best to worst order.
  for (let i = outcome.vaults.length - 1; i >= 0; i -= 1) {
    expectedPostAuction.push([
      `vault${base + i}`,
      { Collateral: { value: scale6(outcome.vaults[i].locked) } },
    ]);
  }
  t.like(arrayToObject(postAuction), arrayToObject(expectedPostAuction));

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

/**
 * @param {object} powers
 * @param {Pick<typeof import('node:child_process'), 'execFileSync' >} powers.childProcess
 * @param {typeof import('node:fs/promises')} powers.fs
 */
const makeProposalExtractor = ({ childProcess, fs }) => {
  const getPkgPath = (pkg, fileName = '') =>
    new URL(`../../../${pkg}/${fileName}`, import.meta.url).pathname;

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

const buildProposal = makeProposalExtractor({
  childProcess: processAmbient,
  fs: fsAmbient.promises,
});

const addSTARsCollateral = async t => {
  const { controller } = t.context;

  t.log('building proposal');
  //   const proposal = await buildProposal(
  //     '@agoric/builders/scripts/inter-protocol/add-STARS.js',
  //   );
  const proposal = await buildProposal({
    package: 'inter-protocol',
    packageScriptName: 'add-STARS',
  });

  for await (const bundle of proposal.bundles) {
    await controller.validateAndInstallBundle(bundle);
  }
  t.log('installed', proposal.bundles.length, 'bundles');

  t.log('launching proposal');
  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposal.evals,
  };
  t.log({ bridgeMessage });

  const { EV } = t.context.runUtils;
  /** @type {ERef<import('@agoric/vats/src/types.js').BridgeHandler>} */
  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);

  t.context.refreshAgoricNamesRemotes();

  t.log('add-STARS proposal executed');
};

export const ensureVaultCollateral = async (collateralBrandKey, t) => {
  // TODO: we'd like to have this work on any brand
  const SUPPORTED_BRANDS = ['ATOM', 'STARS'];

  if (!SUPPORTED_BRANDS.includes(collateralBrandKey)) {
    throw Error('Unsupported brand type');
  }

  if (collateralBrandKey === 'ATOM') {
    return;
  }

  if (collateralBrandKey === 'STARS') {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    await addSTARsCollateral(t);
  }
};
