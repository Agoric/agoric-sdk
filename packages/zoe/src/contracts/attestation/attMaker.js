// @ts-check

import { makeScalarMapStore } from '@agoric/store';

const makeGetAttMaker = makeAttMaker => {
  /** @type {MapStore<Address, AttMaker>} */
  const addressToAttMaker = makeScalarMapStore('address');

  /** @type {GetAttMaker} */
  const getAttMaker = address => {
    assert.typeof(address, 'string');
    if (addressToAttMaker.has(address)) {
      return addressToAttMaker.get(address);
    }
    const attMaker = makeAttMaker(address);
    addressToAttMaker.init(address, attMaker);
    return attMaker;
  };

  harden(getAttMaker);
  return getAttMaker;
};
harden(makeGetAttMaker);
export { makeGetAttMaker };
