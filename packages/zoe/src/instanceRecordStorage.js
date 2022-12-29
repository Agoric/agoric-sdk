import { provide, vivifyFarClass, M } from '@agoric/vat-data';
import { assertKeywordName } from './cleanProposal.js';

const { ownKeys } = Reflect;

const { quote: q, Fail } = assert;

/**
 * The InstanceRecord stores the installation, customTerms, issuers,
 * and brands for a particular Zoe contract instance. The installation
 * and customTerms are never changed, but new issuers (and their
 * matching brands) may be added by the contract code. Thus, an
 * InstanceRecord may be outdated at any particular point. This class
 * manages the creation and updating of an InstanceRecord and provides
 * functions for getting the latest data.
 */

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @returns {(ir: InstanceRecord) => InstanceState}
 */
export const makeInstanceRecordStorage = baggage => {
  provide(baggage, 'instanceRecord', () => undefined);

  const assertInstantiated = instanceRecord =>
    assert(
      instanceRecord !== 'undefined',
      'instanceRecord has not been instantiated',
    );

  const InstanceRecordInterface = M.interface(
    'InstanceRecord',
    // TODO (cth)   actually...
    {},
    { sloppy: true },
  );

  const makeInstanceRecord = vivifyFarClass(
    baggage,
    'InstanceRecord',
    InstanceRecordInterface,
    record => harden({ instanceRecord: record }),
    {
      addIssuer(keyword, issuerRecord) {
        const { state } = this;
        !(keyword in issuerRecord) ||
          Fail`conflicting definition of ${q(keyword)}`;

        assertInstantiated(state.instanceRecord);
        const instanceRecord = state.instanceRecord;
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
        state.instanceRecord = nextInstanceRecord;
      },
      getInstanceRecord() {
        const { state } = this;
        assertInstantiated(state.instanceRecord);
        return state.instanceRecord;
      },
      getTerms() {
        const { state } = this;
        assertInstantiated(state.instanceRecord);
        return state.instanceRecord.terms;
      },
      getInstallation() {
        const { state } = this;
        assertInstantiated(state.instanceRecord);
        return state.instanceRecord.installation;
      },
      getIssuers() {
        const { state } = this;
        assertInstantiated(state.instanceRecord);
        return state.instanceRecord.terms.issuers;
      },
      getBrands() {
        const { state } = this;
        assertInstantiated(state.instanceRecord);
        return state.instanceRecord.terms.brands;
      },
      assertUniqueKeyword(keyword) {
        const { state } = this;
        assertInstantiated(state.instanceRecord);
        assertKeywordName(keyword);
        !ownKeys(state.instanceRecord.terms.issuers).includes(keyword) ||
          Fail`keyword ${q(keyword)} must be unique`;
      },
    },
  );

  return makeInstanceRecord;
};
