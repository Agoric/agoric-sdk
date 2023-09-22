import { Far, passStyleOf } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { assert, Fail } from '@agoric/assert';

// Simple wrapper for serializing and unserializing marshalled values inside the
// kernel, where we don't actually want to use clists nor actually allocate real
// objects, but instead to stay entirely within the domain of krefs.  This is
// used to enable syntactic manipulation of serialized values while remaining
// agnostic about the internal details of the serialization encoding.

/**
 * @typedef {{getKref: () => string, iface: () => string} | Promise} KCap
 */

const { toStringTag } = Symbol;

/**
 * @param {string} kref
 * @param {string} [iface]
 * @returns {import('@endo/eventual-send').ERef<KCap>}
 */
export const kslot = (kref, iface = 'undefined') => {
  assert.typeof(kref, 'string');
  if (iface && iface.startsWith('Alleged: ')) {
    // Encoder prepends "Alleged: " to iface string, but the decoder doesn't strip it
    // Unclear whether it's the decoder or me who is wrong
    iface = iface.slice(9);
  }
  if (
    kref.startsWith('p') ||
    kref.startsWith('kp') ||
    kref.startsWith('lp') ||
    kref.startsWith('rp')
  ) {
    // Bizarro World hack for attaching a string property to a Promise, courtesy
    // of MarkM.  Even though the @@toStringTag property nominally *is* a
    // string, some unfortunate stuff in our hardened JS safety checks blows up
    // if it actually is.  Eventually that will be fixed and we'll be able to
    // use the @@toStringTag property directly, but for now we need to use this
    // weird construct employing a sneaky getter function.  Note that this is
    // only necessary in the first place because smallcaps encodes promise
    // references differently from remotable object references, and the current
    // version of the smallcaps decoder annoyingly insists that if the encoded
    // body string says a slot is a promise, then convertSlotToVal had better by
    // damn return an actual Promise, even if, as in the intended use case here,
    // we neither want nor need a promise nor are capable of making any use of
    // the fact that it is one.
    const p = Promise.resolve(`${kref} stand in`);
    // Bizarro World makes eslint hallucinate
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Object.defineProperty(p, toStringTag, {
      get: reveal => (reveal ? kref : NaN),
      enumerable: false,
    });
    return harden(p);
  } else {
    const o = Far(iface, {
      iface: () => iface,
      getKref: () => `${kref}`,
    });
    return o;
  }
};

/**
 * @param {any} obj
 * @returns {string}
 */
export const krefOf = obj => {
  switch (passStyleOf(obj)) {
    case 'promise': {
      // Other half of Bizarro World hack for handling promises.  Note the
      // peculiar way the @@toStringTag getter is used.
      const desc = Object.getOwnPropertyDescriptor(obj, toStringTag);
      assert(desc !== undefined);
      const getter = desc.get;
      assert.typeof(getter, 'function');
      // @ts-expect-error violates the norm that getters have zero parameters
      const kref = getter(true);
      assert.typeof(kref, 'string');
      return kref;
    }
    case 'remotable': {
      const getKref = obj.getKref;
      assert.typeof(getKref, 'function', 'object lacking getKref function');
      return getKref();
    }
    default:
      // When krefOf() is called as part of kmarshal.serialize, marshal
      // will only give it things that are 'remotable' (Promises and the
      // Far objects created by kslot()).  When krefOf() is called by
      // kernel code (as part of extractSingleSlot() or the vat-comms
      // equivalent), it ought to throw if 'obj' is not one of the
      // objects created by our kslot().
      return Fail`krefOf requires a promise or remotable`;
  }
};

const kmarshal = makeMarshal(krefOf, kslot, {
  serializeBodyFormat: 'smallcaps',
  errorTagging: 'off',
});

export const kser = value => kmarshal.serialize(harden(value));

/**
 * @param {import('@endo/marshal').CapData<string>} serializedValue
 * @returns {any}
 */
export const kunser = serializedValue => kmarshal.unserialize(serializedValue);

export function makeError(message) {
  assert.typeof(message, 'string');
  return kser(Error(message));
}
