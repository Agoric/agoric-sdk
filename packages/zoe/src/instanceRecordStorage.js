import { provide } from '@agoric/vat-data';
import { assertKeywordName } from './cleanProposal.js';

const { ownKeys } = Reflect;

const { details: X, quote: q } = assert;

/**
 * The InstanceRecord stores the installation, customTerms, issuers,
 * and brands for a particular Zoe contract instance. The installation
 * and customTerms are never changed, but new issuers (and their
 * matching brands) may be added by the contract code. Thus, an
 * InstanceRecord may be outdated at any particular point. This file
 * manages the creation and updating of an InstanceRecord and returns
 * functions for getting the latest data.
 */

/**
 * @callback GetInstanceRecord
 * @returns {InstanceRecord}
 */

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @returns {InstanceRecordManager}
 */
export const makeInstanceRecordStorage = baggage => {
  provide(baggage, 'instanceRecord', () => undefined);

  const assertInstantiated = () =>
    assert(
      baggage.get('instanceRecord') !== 'undefined',
      'instanceRecord has not been instantiated',
    );

  const addIssuerToInstanceRecord = (keyword, issuerRecord) => {
    !(keyword in issuerRecord) ||
      assert.fail(X`conflicting definition of ${q(keyword)}`);

    assertInstantiated();
    const instanceRecord = baggage.get('instanceRecord');
    const nextInstanceRecord = harden({
      ...instanceRecord,
      terms: {
        ...instanceRecord.terms,
        issuers: {
          ...instanceRecord.terms.issuers,
          [keyword]: issuerRecord.issuer,
        },
        brands: {
          ...instanceRecord.terms.brands,
          [keyword]: issuerRecord.brand,
        },
      },
    });
    baggage.set('instanceRecord', nextInstanceRecord);
  };

  /** @type {GetInstanceRecord} */
  const getInstanceRecord = () => {
    assertInstantiated();
    return baggage.get('instanceRecord');
  };
  const getTerms = () => {
    assertInstantiated();
    return baggage.get('instanceRecord').terms;
  };
  const getIssuers = () => {
    assertInstantiated();
    return baggage.get('instanceRecord').terms.issuers;
  };
  const getBrands = () => {
    assertInstantiated();
    return baggage.get('instanceRecord').terms.brands;
  };
  /** @type {InstanceRecordManagerGetInstallationForInstance} */
  const getInstallationForInstance = () => {
    assertInstantiated();
    return baggage.get('instanceRecord').installation;
  };

  const assertUniqueKeyword = keyword => {
    assertInstantiated();
    assertKeywordName(keyword);
    !ownKeys(baggage.get('instanceRecord').terms.issuers).includes(keyword) ||
      assert.fail(X`keyword ${q(keyword)} must be unique`);
  };

  const instantiate = startingInstanceRecord => {
    assert(
      baggage.get('instanceRecord') === undefined,
      X`instanceRecord ${baggage.get(
        'instanceRecord',
      )} can only be instantiated once`,
    );
    baggage.set('instanceRecord', startingInstanceRecord);
  };

  return harden({
    addIssuerToInstanceRecord,
    getInstanceRecord,
    getTerms,
    getInstallationForInstance,
    getIssuers,
    getBrands,
    assertUniqueKeyword,
    instantiate,
  });
};

/**
 * Put together the instance record
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {Installation} installation
 * @param {Instance} instance
 * @param {object} customTerms
 * @param {IssuerKeywordRecord} issuers
 * @param {BrandKeywordRecord} brands
 * @returns {InstanceRecordManager}
 */
export const makeAndStoreInstanceRecord = (
  baggage,
  installation,
  instance,
  customTerms,
  issuers,
  brands,
) => {
  const instanceRecord = harden({
    installation,
    instance,
    terms: {
      ...customTerms,
      issuers,
      brands,
    },
  });

  const instanceRecordStorage = makeInstanceRecordStorage(baggage);
  instanceRecordStorage.instantiate(instanceRecord);
  return instanceRecordStorage;
};
