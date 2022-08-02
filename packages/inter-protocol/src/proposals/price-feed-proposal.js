import { E } from '@endo/far';
import { makeIssuerKit } from '@agoric/ertp';
import {
  makeStorageNode,
  sanitizePathSegment,
} from '@agoric/vats/src/lib-chainStorage.js';

import { reserveThenGetNames, reserveThenDeposit } from './utils.js';

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
  /** @type {NameAdmin} */
  const obAdmin = E(agoricNamesAdmin).lookupAdmin('oracleBrand');

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
 * @param {{options: {priceFeedOptions: {AGORIC_INSTANCE_NAME: string, oracleAddresses: UNKNOWN, contractTerms: unknown, IN_BRAND_NAME: string, OUT_BRAND_NAME: string}}}} config
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
  const STORAGE_PATH = 'priceFeed';

  // Default to an empty Map and home.priceAuthority.
  produceAggregators.resolve(new Map());
  E(client).assignBundle([_addr => ({ priceAuthority })]);

  const timer = await chainTimerService;

  /**
   * Values come from economy-template.json, which at this writing had IN:ATOM, OUT:USD
   *
   * @type {[[Brand, Brand], [Installation]]}
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

  /** @type {import('@agoric/zoe/src/contracts/priceAggregator.js').PriceAggregatorContract['terms']} */
  const terms = {
    ...contractTerms,
    description: AGORIC_INSTANCE_NAME,
    brandIn,
    brandOut,
    timer,
  };

  const storageNode = await makeStorageNode(chainStorage, STORAGE_PATH);
  const marshaller = E(board).getReadonlyMarshaller();

  // Create the price feed.
  const aggregator = await E(zoe).startInstance(
    priceAggregator,
    undefined,
    terms,
    {
      storageNode: E(storageNode).getChildNode(
        sanitizePathSegment(AGORIC_INSTANCE_NAME),
      ),
      marshaller,
    },
  );
  E(aggregators).set(terms, { aggregator });

  E(E(agoricNamesAdmin).lookupAdmin('instance')).update(
    AGORIC_INSTANCE_NAME,
    aggregator.instance,
  );

  // Publish price feed in home.priceAuthority.
  const forceReplace = true;
  E(priceAuthorityAdmin)
    .registerPriceAuthority(
      E(aggregator.publicFacet).getPriceAuthority(),
      brandIn,
      brandOut,
      forceReplace,
    )
    .then(deleter => E(aggregators).set(terms, { aggregator, deleter }));

  /**
   * Send an invitation to one of the oracles.
   *
   * @param {string} addr
   */
  const distributeInvitation = async addr => {
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

  await Promise.all(oracleAddresses.map(distributeInvitation));
};

// Return the manifest, installations, and options.
const t = 'priceFeed';
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
