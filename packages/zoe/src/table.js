import makeWeakStore from '@agoric/weak-store';
import { assert, details } from '@agoric/assert';

import '../exported';
import './internal-types';

/**
 * This definition is used to ensure the proper typing of
 * makeCustomMethodsFn.
 * @2type {_ => {}}
 */
const DEFAULT_CUSTOM_METHODS = _ => ({});

/**
 * Create an opaque handle object.
 *
 * @template {string} H
 * @param {H} handleType the string literal type of the handle
 */
export const makeHandle = handleType => {
  // This assert ensures that handleType is referenced.
  assert.typeof(handleType, 'string', 'handleType must be a string');
  // Return the intersection type (really just an empty object).
  return /** @type {Handle<H>} */ (harden({}));
};

/**
 * @template {{}} T
 * @template U
 * @param {(record: any) => record is U} validateFn
 * @param {string} [handleDebugName='Handle'] the debug name for the table key
 * @param {(table: Table<U>) => T} [makeCustomMethodsFn=DEFAULT_CUSTOM_METHODS]
 * @return {Table<U> & T}
 */
export const makeTable = (
  validateFn,
  handleDebugName = 'Handle',
  makeCustomMethodsFn = DEFAULT_CUSTOM_METHODS,
) => {
  // The WeakMap that stores the records
  /**
   * @type {WeakStore<{},T>}
   */
  const handleToRecord = makeWeakStore(handleDebugName);

  /** @type {Table<T>} */
  const table = harden({
    validate: validateFn,
    create: (record, handle = harden({})) => {
      record = harden({
        ...record,
        handle, // reliably add the handle to the record
      });
      table.validate(record);
      handleToRecord.init(handle, record);
      return handle;
    },
    get: handleToRecord.get,
    has: handleToRecord.has,
    delete: handleToRecord.delete,
    update: (handle, partialRecord) => {
      const record = handleToRecord.get(handle);
      const updatedRecord = harden({
        ...record,
        ...partialRecord,
      });
      table.validate(updatedRecord);
      handleToRecord.set(handle, updatedRecord);
      return handle;
    },
  });

  /** @type {typeof table & U} */
  const customMethodsTable = harden({
    ...makeCustomMethodsFn(table),
    ...table,
  });
  return customMethodsTable;
};

/**
 * @template T
 * @template {(keyof T)[]} U
 * @param {U} expectedProperties
 * @returns {Validator<Record<U[number]|'handle',any>>}
 */
export const makeValidateProperties = expectedProperties => {
  // add handle to properties to check
  const checkSet = new Set(expectedProperties);
  checkSet.add('handle');
  const checkProperties = harden([...checkSet.values()].sort());
  return obj => {
    const actualProperties = Object.getOwnPropertyNames(obj);
    actualProperties.sort();
    assert(
      actualProperties.length === checkProperties.length,
      details`the actual properties (${actualProperties}) did not match the \
      expected properties (${checkProperties})`,
    );
    for (let i = 0; i < actualProperties.length; i += 1) {
      assert(
        checkProperties[i] === actualProperties[i],
        details`property '${checkProperties[i]}' did not equal actual property '${actualProperties[i]}'`,
      );
    }
    return true;
  };
};
