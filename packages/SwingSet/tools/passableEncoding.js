import { assert } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import { isObject, makeMarshal } from '@endo/marshal';

const { Fail, quote: q } = assert;

const noop = () => {};

// TODO define these somewhere more accessible. https://github.com/endojs/endo/issues/1488
/**
 * @typedef {Promise | import('@agoric/internal').Remotable} PassByRef
 * Gets transformed by a marshaller encoding.
 * As opposed to pass-by-copy
 */

export const makePassableEncoding = () => {
  // Represent all data as passable by replacing non-passable values
  // with special-prefix registered symbols.
  /** @type {Map<symbol, PassByRef>} */
  const replaced = new Map();
  /** @type {Map<PassByRef, symbol>} */
  const replacements = new Map(); // inverse of 'replaced'

  // This is testing code, so we don't enforce absence of this prefix
  // from manually created symbols.
  const replacementPrefix = 'replaced:';
  const provideReplacement = value => {
    if (replacements.has(value)) {
      return replacements.get(value);
    }

    const replacement = Symbol.for(`${replacementPrefix}${replaced.size}`);
    replacements.set(value, replacement);
    replaced.set(replacement, value);

    // Suppress unhandled promise rejection warnings.
    void E.when(value, noop, noop);

    return replacement;
  };
  const { serialize: encodeReplacements } = makeMarshal(
    provideReplacement,
    undefined,
    {
      marshalSaveError: () => {},
      serializeBodyFormat: 'capdata',
    },
  );
  const { unserialize: decodeReplacements } = makeMarshal(
    undefined,
    undefined,
    {
      serializeBodyFormat: 'capdata',
    },
  );
  const encodePassable = value => decodeReplacements(encodeReplacements(value));
  const decodePassable = arg => {
    // Recursively replace our symbols with their non-passable source data.
    if (Array.isArray(arg)) {
      return arg.map(decodePassable);
    } else if (isObject(arg)) {
      const entries = Object.entries(arg);
      const decodedEntries = entries.map(([key, value]) => [
        key,
        decodePassable(value),
      ]);
      return Object.fromEntries(decodedEntries);
    } else if (
      typeof arg !== 'symbol' ||
      !Symbol.keyFor(arg) ||
      !arg.description?.startsWith(replacementPrefix)
    ) {
      return arg;
    }
    const value =
      replaced.get(arg) || Fail`no value for replacement: ${q(arg)}`;
    return value;
  };
  return { encodePassable, decodePassable };
};
