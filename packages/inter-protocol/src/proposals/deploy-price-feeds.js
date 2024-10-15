import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

import { unitAmount } from '@agoric/zoe/src/contractSupport/priceQuote.js';
import {
  oracleBrandFeedName,
  reserveThenDeposit,
  sanitizePathSegment,
} from './utils.js';
import { replaceScaledPriceAuthorities } from './replace-scaledPriceAuthorities.js';

const STORAGE_PATH = 'priceFeed';

/** @type {ChainlinkConfig} */
export const DEFAULT_CONTRACT_TERMS = {
  maxSubmissionCount: 1000,
  minSubmissionCount: 2,
  restartDelay: 1n, // the number of rounds an Oracle has to wait before they can initiate another round
  timeout: 10, // in seconds according to chainTimerService
  minSubmissionValue: 1,
  maxSubmissionValue: 2 ** 256,
};

/** @import {EconomyBootstrapPowers} from './econ-behaviors.js'; */
/** @import {ChainlinkConfig} from '@agoric/inter-protocol/src/price/fluxAggregatorKit.js'; */
/** @import {FluxStartFn} from '@agoric/inter-protocol/src/price/fluxAggregatorContract.js'; */

const trace = makeTracer('DeployPriceFeed', true);

/**
 * @typedef {{
 *   oracleAddresses: string[];
 *   inBrandNames: string[];
 *   contractTerms?: Partial<ChainlinkConfig>;
 * }} PriceFeedConfig
 */

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {string} bundleID
 */
const installPriceAggregator = async (
  {
    consume: { zoe },
    installation: {
      produce: { priceAggregator },
    },
  },
  bundleID,
) => {
  /** @type {Installation<FluxStartFn>} */
  const installation = await E(zoe).installBundleID(bundleID);
  priceAggregator.reset();
  priceAggregator.resolve(installation);
  trace('installed priceAggregator', bundleID.slice(0, 'b1-1234567'.length));
  return installation;
};

/**
 * Provide (find/create) inert brands (no mint or issuer) referred to by oracles
 *
 * @param {EconomyBootstrapPowers & NamedVatPowers} space
 * @param {{ name: string; decimalPlaces: number }} opt
 * @returns {Promise<Brand<'nat'>>}
 */
export const ensureOracleBrand = async (
  {
    namedVat: {
      consume: { agoricNames },
    },
    oracleBrand: { produce: oracleBrandProduce },
  },
  { name, decimalPlaces },
) => {
  const brand = E(agoricNames).provideInertBrand(name, {
    assetKind: 'nat',
    decimalPlaces,
  });

  oracleBrandProduce[name].reset();
  oracleBrandProduce[name].resolve(brand);
  return brand;
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {{
 *   AGORIC_INSTANCE_NAME: string;
 *   contractTerms: import('@agoric/inter-protocol/src/price/fluxAggregatorKit.js').ChainlinkConfig;
 *   brandIn: Brand<'nat'>;
 *   brandOut: Brand<'nat'>;
 * }} config
 * @param {Installation<FluxStartFn>} installation
 */
const startPriceAggregatorInstance = async (
  {
    consume: {
      board,
      chainStorage,
      chainTimerService,
      econCharterKit,
      highPrioritySendersManager,
      namesByAddressAdmin,
      startGovernedUpgradable,
    },
    instance: { produce: produceInstance },
  },
  { AGORIC_INSTANCE_NAME, contractTerms, brandIn, brandOut },
  installation,
) => {
  trace('startPriceAggregatorInstance', AGORIC_INSTANCE_NAME);
  const label = sanitizePathSegment(AGORIC_INSTANCE_NAME);

  const feedsStorage = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const storageNode = await E(feedsStorage).makeChildNode(label);
  const marshaller = await E(board).getReadonlyMarshaller();

  const terms = harden({
    ...contractTerms,
    description: AGORIC_INSTANCE_NAME,
    brandIn,
    brandOut,
    // XXX powerful TimerService, see #6003
    timer: await chainTimerService,
    unitAmountIn: await unitAmount(brandIn),
  });
  const privateArgs = {
    highPrioritySendersManager: await highPrioritySendersManager,
    marshaller,
    namesByAddressAdmin,
    storageNode,
  };
  const governedKit = await E(startGovernedUpgradable)({
    governedParams: {},
    privateArgs,
    terms,
    label,
    // @ts-expect-error GovernableStartFn vs. fluxAggregatorContract.js start
    installation,
  });
  produceInstance[AGORIC_INSTANCE_NAME].reset();
  produceInstance[AGORIC_INSTANCE_NAME].resolve(governedKit.instance);
  trace(
    'new instance',
    label,
    { terms, privateArgs, installation },
    governedKit,
  );

  await E(E.get(econCharterKit).creatorFacet).addInstance(
    governedKit.instance,
    governedKit.governorCreatorFacet,
    AGORIC_INSTANCE_NAME,
  );
  trace('added', label, 'instance to econCharter');

  /** @type {import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<FluxStartFn>} */
  // @ts-expect-error
  const { instance, publicFacet, creatorFacet } = governedKit;

  return harden({ instance, publicFacet, creatorFacet });
};

/**
 * Send invitations to oracle operators for a price feed.
 *
 * @param {EconomyBootstrapPowers} powers
 * @param {{ oracleAddresses: string[]; AGORIC_INSTANCE_NAME: string }} config
 * @param {any} creatorFacet
 */
const distributeInvitations = async (
  { consume: { namesByAddressAdmin } },
  { oracleAddresses, AGORIC_INSTANCE_NAME },
  creatorFacet,
) => {
  /** @param {string} addr */
  const addOracle = async addr => {
    const invitation = await E(creatorFacet).makeOracleInvitation(addr);
    const debugName = `${AGORIC_INSTANCE_NAME} member ${addr}`;
    await reserveThenDeposit(debugName, namesByAddressAdmin, addr, [
      invitation,
    ]).catch(err => console.error(`failed deposit to ${debugName}`, err));
  };

  trace('distributing invitations', oracleAddresses);
  // This doesn't resolve until oracle operators create their smart wallets.
  // Don't block completion on it.
  void Promise.all(oracleAddresses.map(addOracle));
  trace('createPriceFeed complete');
};

/**
 * @param {EconomyBootstrapPowers & NamedVatPowers} powers
 * @param {{
 *   options: PriceFeedConfig & {
 *     priceAggregatorRef: { bundleID: string };
 *     scaledPARef: { bundleID: string };
 *     inBrandsDecimals?: number;
 *     contractTerms?: ChainlinkConfig;
 *     outBrandName?: string;
 *     outBrandDecimals?: number;
 *   };
 * }} config
 */
export const deployPriceFeeds = async (powers, config) => {
  const {
    inBrandNames,
    oracleAddresses,
    contractTerms,
    priceAggregatorRef,
    scaledPARef,
    inBrandsDecimals = 6,
    outBrandName = 'USD',
    outBrandDecimals = 6,
  } = config.options;
  await null;

  const installation = await installPriceAggregator(
    powers,
    priceAggregatorRef.bundleID,
  );

  const { priceAuthorityAdmin, priceAuthority } = powers.consume;
  for (const inBrandName of inBrandNames) {
    const AGORIC_INSTANCE_NAME = oracleBrandFeedName(inBrandName, outBrandName);
    const brandIn = await ensureOracleBrand(powers, {
      name: inBrandName,
      decimalPlaces: inBrandsDecimals,
    });
    const brandOut = await ensureOracleBrand(powers, {
      name: outBrandName,
      decimalPlaces: outBrandDecimals,
    });
    const kit = await startPriceAggregatorInstance(
      powers,
      {
        AGORIC_INSTANCE_NAME,
        brandIn,
        brandOut,
        contractTerms: { ...DEFAULT_CONTRACT_TERMS, ...contractTerms },
      },
      installation,
    );

    const forceReplace = true;
    await E(priceAuthorityAdmin).registerPriceAuthority(
      E(kit.publicFacet).getPriceAuthority(),
      brandIn,
      brandOut,
      forceReplace,
    );

    await distributeInvitations(
      powers,
      { oracleAddresses, AGORIC_INSTANCE_NAME },
      kit.creatorFacet,
    );
  }

  // @ts-expect-error replaceScaledPriceAuthorities uses a subset of the powers.
  await replaceScaledPriceAuthorities(powers, {
    options: { scaledPARef },
  });

  // cf. #8400 QuotePayments storage leak
  powers.produce.priceAuthority8400.resolve(priceAuthority);
};

const t = 'priceFeed';

/**
 * Thread price feed upgrade options through from builder to core-eval.
 *
 * @param {object} utils
 * @param {any} utils.restoreRef
 * @param {PriceFeedConfig & { priceAggregatorRef: any }} priceFeedOptions
 */
export const getManifestForPriceFeeds = async (
  { restoreRef: _restoreRef },
  priceFeedOptions,
) => ({
  manifest: {
    [deployPriceFeeds.name]: {
      namedVat: t,
      consume: {
        agoricNamesAdmin: t,
        agoricNames: t,
        board: t,
        chainStorage: t,
        chainTimerService: t,
        contractKits: t,
        econCharterKit: t,
        highPrioritySendersManager: t,
        instancePrivateArgs: t,
        namesByAddressAdmin: t,
        priceAuthority: t,
        priceAuthorityAdmin: t,
        startGovernedUpgradable: t,
        startUpgradable: t,
        zoe: t,
      },
      installation: { produce: { priceAggregator: t } },
      instance: {
        produce: t,
      },
      oracleBrand: { produce: t },
      produce: { priceAuthority8400: t },
    },
  },
  options: { ...priceFeedOptions },
});
