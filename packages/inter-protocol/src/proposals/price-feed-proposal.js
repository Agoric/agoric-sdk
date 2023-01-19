// @ts-nocheck -- lots of type errors. low prio b/c proposals are like scripts
import { E } from '@endo/far';
import { makeIssuerKit } from '@agoric/ertp';
import {
  makeStorageNodeChild,
  assertPathSegment,
} from '@agoric/vats/src/lib-chainStorage.js';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';

import { unitAmount } from '@agoric/zoe/src/contractSupport/priceQuote.js';
import { reserveThenDeposit, reserveThenGetNames } from './utils.js';

const trace = makeTracer('RunPriceFeed');

/** @type {(name: string) => string} */
const sanitizePathSegment = name => {
  const candidate = name.replace(/ /g, '_');
  assertPathSegment(candidate);
  return candidate;
};

/**
 * @typedef {{
 * brandIn?: ERef<Brand<'nat'> | undefined>,
 * brandOut?: ERef<Brand<'nat'> | undefined>,
 * IN_BRAND_NAME: string,
 * IN_BRAND_DECIMALS: string,
 * OUT_BRAND_NAME: string,
 * OUT_BRAND_DECIMALS: string,
 * }} PriceFeedOptions
 */

/**
 * Create inert brands (no mint or issuer) referred to by price oracles.
 *
 * @param {ChainBootstrapSpace} space
 * @param {{options: {priceFeedOptions: PriceFeedOptions}}} opt
 * @returns {Promise<[Brand<'nat'>, Brand<'nat'>]>}
 */
export const ensureOracleBrands = async (
  { consume: { agoricNamesAdmin } },
  {
    options: {
      priceFeedOptions: {
        brandIn: rawBrandIn,
        brandOut: rawBrandOut,
        IN_BRAND_NAME,
        IN_BRAND_DECIMALS,
        OUT_BRAND_NAME,
        OUT_BRAND_DECIMALS,
      },
    },
  },
) => {
  trace('ensureOracleBrands');
  /** @type {Promise<import('@agoric/vats').NameAdmin>} */
  const obAdmin = E(agoricNamesAdmin).lookupAdmin('oracleBrand');

  /** @type {(brand: ERef<Brand<'nat'> | undefined>, name: string, decimals: string) => Promise<Brand<'nat'>>} */
  const updateFreshBrand = async (brand, name, decimals) => {
    const b = await brand;
    if (b) {
      // Don't update if it was already set.
      return b;
    }
    const freshBrand = makeIssuerKit(
      name,
      undefined,
      harden({ decimalPlaces: parseInt(decimals, 10) }),
    ).brand;

    if (!name) {
      // Don't update unnamed brands.
      return freshBrand;
    }

    // Atomically update if not already set.
    return E(obAdmin).default(name, freshBrand);
  };

  return Promise.all([
    updateFreshBrand(rawBrandIn, IN_BRAND_NAME, IN_BRAND_DECIMALS),
    updateFreshBrand(rawBrandOut, OUT_BRAND_NAME, OUT_BRAND_DECIMALS),
  ]);
};

/**
 * @param {ChainBootstrapSpace} powers
 * @param {{options: {priceFeedOptions: {AGORIC_INSTANCE_NAME: string, oracleAddresses: string[], contractTerms: import('@agoric/inter-protocol/src/price/priceAggregatorChainlink.js').ChainlinkConfig, IN_BRAND_NAME: string, OUT_BRAND_NAME: string}}}} config
 */
export const createPriceFeed = async (
  {
    consume: {
      agoricNamesAdmin,
      aggregators,
      board,
      chainStorage,
      chainTimerService,
      client,
      namesByAddressAdmin,
      priceAuthority,
      priceAuthorityAdmin,
      zoe,
    },
    produce: { aggregators: produceAggregators },
  },
  {
    options: {
      priceFeedOptions: {
        AGORIC_INSTANCE_NAME,
        oracleAddresses,
        contractTerms,
        IN_BRAND_NAME,
        OUT_BRAND_NAME,
      },
    },
  },
) => {
  trace('createPriceFeed');
  const STORAGE_PATH = 'priceFeed';

  // Default to an empty Map and home.priceAuthority.
  produceAggregators.resolve(new Map());
  void E(client).assignBundle([_addr => ({ priceAuthority })]);

  const timer = await chainTimerService;

  /**
   * Values come from economy-template.json, which at this writing had IN:ATOM, OUT:USD
   *
   * @type {[[Brand<'nat'>, Brand<'nat'>], [Installation<import('@agoric/inter-protocol/src/price/priceAggregatorChainlink.js').start>]]}
   */
  const [[brandIn, brandOut], [priceAggregator]] = await Promise.all([
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('oracleBrand'), [
      IN_BRAND_NAME,
      OUT_BRAND_NAME,
    ]),
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('installation'), [
      'priceAggregator',
    ]),
  ]);

  const unitAmountIn = await unitAmount(brandIn);
  const terms = await deeplyFulfilledObject(
    harden({
      ...contractTerms,
      description: AGORIC_INSTANCE_NAME,
      brandIn,
      brandOut,
      timer,
      unitAmountIn,
    }),
  );

  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = E(board).getReadonlyMarshaller();

  // Create the price feed.
  const aggregator = await E(zoe).startInstance(
    priceAggregator,
    undefined,
    terms,
    {
      storageNode: E(storageNode).makeChildNode(
        sanitizePathSegment(AGORIC_INSTANCE_NAME),
      ),
      marshaller,
    },
  );
  await E(aggregators).set(terms, { aggregator });

  E(E(agoricNamesAdmin).lookupAdmin('instance')).update(
    AGORIC_INSTANCE_NAME,
    aggregator.instance,
  );

  // Publish price feed in home.priceAuthority.
  const forceReplace = true;
  void E(priceAuthorityAdmin)
    .registerPriceAuthority(
      E(aggregator.publicFacet).getPriceAuthority(),
      brandIn,
      brandOut,
      forceReplace,
    )
    .then(deleter => E(aggregators).set(terms, { aggregator, deleter }));

  /**
   * Initialize a new oracle and send an invitation to administer it.
   *
   * @param {string} addr
   */
  const addOracle = async addr => {
    const invitation = await E(aggregator.creatorFacet).makeOracleInvitation(
      addr,
    );
    await reserveThenDeposit(
      `${AGORIC_INSTANCE_NAME} member ${addr}`,
      namesByAddressAdmin,
      addr,
      [invitation],
    );
  };

  trace('distributing invitations', oracleAddresses);
  await Promise.all(oracleAddresses.map(addOracle));
  trace('createPriceFeed complete');
};

const t = 'priceFeed';
/**
 * Add a price feed to a running chain, returning the manifest, installations, and options.
 *
 * @param {object} utils
 * @param {(ref: unknown) => Promise<unknown>} [utils.restoreRef]
 * @param {PriceFeedOptions} priceFeedOptions
 */
export const getManifestForPriceFeed = async (
  { restoreRef },
  priceFeedOptions,
) => ({
  manifest: {
    [createPriceFeed.name]: {
      consume: {
        aggregators: t,
        agoricNamesAdmin: t,
        board: t,
        chainStorage: t,
        chainTimerService: t,
        client: t,
        namesByAddressAdmin: t,
        priceAuthority: t,
        priceAuthorityAdmin: t,
        zoe: t,
      },
      produce: { aggregators: t },
    },
    [ensureOracleBrands.name]: {
      consume: {
        agoricNamesAdmin: t,
      },
    },
  },
  installations: {
    priceAggregator: restoreRef(priceFeedOptions.priceAggregatorRef),
  },
  options: {
    priceFeedOptions: {
      brandIn:
        priceFeedOptions.brandInRef && restoreRef(priceFeedOptions.brandInRef),
      brandOut:
        priceFeedOptions.brandOutRef &&
        restoreRef(priceFeedOptions.brandeOutRef),
      ...priceFeedOptions,
    },
  },
});

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {object} [config]
 * @param {object} [config.options]
 * @param {string[]} [config.options.demoOracleAddresses]
 */
export const startPriceFeeds = async (
  {
    consume,
    produce,
    installation: {
      consume: { priceAggregator },
    },
  },
  { options: { demoOracleAddresses = [] } = {} },
) => {
  trace('startPriceFeeds');

  // eventually this will have be parameterized. for now we just need one contract
  // working well enough to build tooling around.
  const inBrandName = 'ATOM';
  const outBrandName = 'USD';

  /** @type {ERef<NameAdmin>} */
  const installAdmin = E(consume.agoricNamesAdmin).lookupAdmin('installation');
  await E(installAdmin).update('priceAggregator', priceAggregator);

  await ensureOracleBrands(
    { consume },
    {
      options: {
        priceFeedOptions: {
          IN_BRAND_NAME: inBrandName,
          IN_BRAND_DECIMALS: '6',
          OUT_BRAND_NAME: outBrandName,
          OUT_BRAND_DECIMALS: '6',
        },
      },
    },
  );

  await createPriceFeed(
    { consume, produce },
    {
      options: {
        priceFeedOptions: {
          AGORIC_INSTANCE_NAME: `${inBrandName}-${outBrandName} price feed`,
          contractTerms: {
            minSubmissionCount: 2,
            minSubmissionValue: 1,
            maxSubmissionCount: 5,
            maxSubmissionValue: 99999,
            restartDelay: 1n,
            timeout: 10,
          },
          oracleAddresses: demoOracleAddresses,
          IN_BRAND_NAME: inBrandName,
          OUT_BRAND_NAME: outBrandName,
        },
      },
    },
  );
  trace('startPriceFeeds complete');
};
harden(startPriceFeeds);

export const PRICE_FEEDS_MANIFEST = harden({
  [startPriceFeeds.name]: {
    consume: {
      agoricNamesAdmin: true,
      aggregators: true,
      board: true,
      chainStorage: true,
      chainTimerService: true,
      client: true,
      namesByAddressAdmin: true,
      priceAuthority: true,
      priceAuthorityAdmin: true,
      zoe: true,
    },
    produce: { aggregators: true },
    installation: { consume: { priceAggregator: true } },
  },
});
