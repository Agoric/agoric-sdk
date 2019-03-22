import harden from '@agoric/harden';
import Nat from '@agoric/nat';

// Special property name that indicates an encoding that needs special
// decoding.
const QCLASS = '@qclass';
export { QCLASS };

// objects can only be passed in one of two/three forms:
// 1: pass-by-presence: all properties (own and inherited) are methods,
//    the object itself is of type object, not function
// 2: pass-by-copy: all string-named own properties are data, not methods
//    the object must inherit from Object.prototype or null
// 3: the empty object is pass-by-presence, for identity comparison

// todo: maybe rename pass-by-presence to pass-as-presence, or pass-by-proxy
// or remote reference

// all objects must be frozen

// anything else will throw an error if you try to serialize it

// with these restrictions, our remote call/copy protocols expose all useful
// behavior of these objects: pass-by-presence objects have no other data (so
// there's nothing else to copy), and pass-by-copy objects have no other
// behavior (so there's nothing else to invoke)

function canPassByCopy(val) {
  if (!Object.isFrozen(val)) {
    return false;
  }
  if (typeof val !== 'object') {
    return false;
  }
  const names = Object.getOwnPropertyNames(val);
  const hasFunction = names.some(name => typeof val[name] === 'function');
  if (hasFunction) return false;
  const p = Object.getPrototypeOf(val);
  if (p !== null && p !== Object.prototype && p !== Array.prototype) {
    // todo: arrays should also be Array.isArray(val)
    return false;
  }
  if (names.length === 0) {
    // empty objects are pass-by-presence, not pass-by-copy
    return false;
  }
  return true;
}

export function mustPassByPresence(val) {
  // throws exception if cannot
  if (!Object.isFrozen(val)) {
    throw new Error(`cannot serialize non-frozen objects like ${val}`);
  }
  if (typeof val !== 'object') {
    throw new Error(`cannot serialize non-objects like ${val}`);
  }

  const names = Object.getOwnPropertyNames(val);
  names.forEach(name => {
    if (name === 'e') {
      // hack to allow Vows to pass-by-presence
      return;
    }
    if (typeof val[name] !== 'function') {
      throw new Error(
        `cannot serialize objects with non-methods like the .${name} in ${val}`,
      );
      // return false;
    }
  });

  const p = Object.getPrototypeOf(val);
  if (p !== null && p !== Object.prototype) {
    mustPassByPresence(p);
  }
  // ok!
}

export function makeMarshal(serializeSlot, unserializeSlot) {
  function makeReplacer(slots, slotMap) {
    const ibidMap = new Map();
    let ibidCount = 0;

    return function replacer(_, val) {
      // First we handle all primitives. Some can be represented directly as
      // JSON, and some must be encoded as [QCLASS] composites.
      switch (typeof val) {
        case 'object': {
          if (val === null) {
            return null;
          }
          if (!Object.isFrozen(val)) {
            console.log(
              'asked to serialize',
              val,
              typeof val,
              Object.isFrozen(val),
            );
            throw new Error(
              `non-frozen objects like ${val} are disabled for now`,
            );
          }
          break;
        }
        case 'function': {
          throw new Error(`bare functions like ${val} are disabled for now`);
        }
        case 'undefined': {
          return harden({ [QCLASS]: 'undefined' });
        }
        case 'string':
        case 'boolean': {
          return val;
        }
        case 'number': {
          if (Number.isNaN(val)) {
            return harden({ [QCLASS]: 'NaN' });
          }
          if (Object.is(val, -0)) {
            return harden({ [QCLASS]: '-0' });
          }
          if (val === Infinity) {
            return harden({ [QCLASS]: 'Infinity' });
          }
          if (val === -Infinity) {
            return harden({ [QCLASS]: '-Infinity' });
          }
          return val;
        }
        case 'symbol': {
          const optKey = Symbol.keyFor(val);
          if (optKey === undefined) {
            // TODO: Symmetric unguessable identity
            throw new TypeError('Cannot serialize unregistered symbol');
          }
          return harden({
            [QCLASS]: 'symbol',
            key: optKey,
          });
        }
        case 'bigint': {
          return harden({
            [QCLASS]: 'bigint',
            digits: String(val),
          });
        }
        default: {
          // TODO non-std exotic objects are allowed other typeofs.
          // Perhaps a warning and break would be better.
          throw new TypeError(`unrecognized typeof ${typeof val}`);
        }
      }

      // Now that we've handled all the primitives, it is time to deal with
      // objects. The only things which can pass this point are frozen and
      // non-null.

      if (QCLASS in val) {
        // TODO Hilbert hotel
        throw new Error(`property "${QCLASS}" reserved`);
      }

      // if we've seen this object before, serialize a backref

      if (ibidMap.has(val)) {
        // Backreference to prior occurrence
        return harden({
          [QCLASS]: 'ibid',
          index: ibidMap.get(val),
        });
      }
      ibidMap.set(val, ibidCount);
      ibidCount += 1;

      // We can serialize some things as plain pass-by-copy: arrays, and
      // objects with one or more data properties but no method properties.

      // todo: handle this properly, by constructing a @qclass: error
      if (val instanceof Error) {
        console.log('cannot yet serialize Errors correctly', val);
        console.log('stack was:', val);
        throw new Error('cannot yet serialize Errors correctly');
      }

      if (canPassByCopy(val)) {
        // console.log(`canPassByCopy: ${val}`);
        // Purposely in-band for readability, but creates need for
        // Hilbert hotel.
        return val;
      }

      // beyond this point it must either be a proxy (created by an inbound
      // call) or a pass-by-presence object
      // console.log(`serializeSlot: ${val}`);
      return serializeSlot(val, slots, slotMap);
    };
  }

  // val might be a primitive, a pass by (shallow) copy object, a
  // remote reference, or other.  We treat all other as a local object
  // to be exported as a local webkey.
  function serialize(val) {
    const slots = [];
    const slotMap = new Map(); // maps val (proxy or presence) to index of slots[]
    return {
      argsString: JSON.stringify(val, makeReplacer(slots, slotMap)),
      slots,
    };
  }

  function makeReviver(slots) {
    const ibids = [];

    return function reviver(_, data) {
      if (Object(data) !== data) {
        // primitives pass through
        return data;
      }
      if (QCLASS in data) {
        const qclass = `${data[QCLASS]}`;
        switch (qclass) {
          // Encoding of primitives not handled by JSON
          case 'undefined': {
            return undefined;
          }
          case '-0': {
            return -0;
          }
          case 'NaN': {
            return NaN;
          }
          case 'Infinity': {
            return Infinity;
          }
          case '-Infinity': {
            return -Infinity;
          }
          case 'symbol': {
            return Symbol.for(data.key);
          }
          case 'bigint': {
            /* eslint-disable-next-line no-undef */
            return BigInt(data.digits);
          }

          case 'ibid': {
            const index = Nat(data.index);
            if (index >= ibids.length) {
              throw new RangeError(`ibid out of range: ${index}`);
            }
            return ibids[index];
          }

          case 'slot': {
            data = unserializeSlot(data, slots);
            // overwrite data and break to ibid registration.
            break;
          }
          default: {
            // TODO reverse Hilbert hotel
            throw new TypeError(`unrecognized ${QCLASS} ${qclass}`);
          }
        }
      } else {
        // The unserialized copy also becomes pass-by-copy, but we don't need
        // to mark it specially
        // todo: what if the unserializer is given "{}"?
      }
      // The ibids case returned early to avoid this.
      ibids.push(data);
      return harden(data);
    };
  }

  function unserialize(str, slots) {
    return JSON.parse(str, makeReviver(slots));
  }

  return harden({
    serialize,
    unserialize,
  });
}
