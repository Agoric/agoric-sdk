// @ts-check

import { makeTable, makeValidateProperties } from './table';

import '../exported';
import './internal-types';

/**
 * @template K,V
 * @typedef {import('@agoric/weak-store').WeakStore<K,V>} WeakStore
 */

// Instance Table key: InstanceHandle
// Columns: issuerKeywordTable, brandKeywordTable, terms
const makeInstanceTable = () => {
  /** @type {Validator<IssuerRecord>} */
  const validateSomewhat = makeValidateProperties(
    harden(['issuerKeywordRecord', 'brandKeywordRecord', 'terms']),
  );

  return makeTable(validateSomewhat, 'instanceHandle');
};

export { makeInstanceTable };
