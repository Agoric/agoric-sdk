import { Far, makeMarshal } from '@endo/marshal';
import { assert } from '@agoric/assert';

// Simple wrapper for serializing and unserializing marshalled values inside the
// kernel, where we don't actually want to use clists nor actually allocate real
// objects, but instead to stay entirely within the domain of krefs.  This is
// used to enable syntactic manipulation of serialized values while remaining
// agnostic about the internal details of the serialization encoding.

const refMap = new WeakMap();

export const kslot = (kref, iface) => {
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
    // TODO: temporary hack because smallcaps encodes promise references
    // differently from remotable object references, and the current version of
    // the smallcaps decoder annoyingly insists that if the encoded body string
    // says a slot is a promise, then convertSlotToVal had better by damn return
    // an actual Promise, even if, as in the intended use case here, we neither
    // want nor need a promise, nor the overhead of a map to keep track of it
    // with.  This behavior is in service of defense against a hypothesized
    // security issue whose exact nature has largely been forgotton in the
    // months since it was first encountered.  MarkM is currently researching
    // what the problem was thought to have been, to see if it is real and to
    // understand it if so.  This will eventually result in either changes to
    // the smallcaps encoding or to the marshal setup API to support the purely
    // manipulative use case.  In the meantime, this ugliness...
    const p = new Promise(() => undefined);
    refMap.set(p, kref);
    return harden(p);
  } else {
    const o = Far(iface, {
      iface: () => iface,
      getKref: () => `${kref}`,
    });
    return o;
  }
};

export const krefOf = obj => {
  const fromMap = refMap.get(obj);
  if (fromMap) {
    return fromMap;
  }
  if (obj.getKref) {
    return obj.getKref();
  }
  return null;
};

const kmarshal = makeMarshal(krefOf, kslot, {
  serializeBodyFormat: 'smallcaps',
  errorTagging: 'off',
});

export const kser = value => kmarshal.serialize(harden(value));

export const kunser = serializedValue => kmarshal.unserialize(serializedValue);

export function makeError(message) {
  assert.typeof(message, 'string');
  return kser(Error(message));
}
