// @ts-check

import { makeStore } from '@agoric/store';

const makeGetAttMaker = makeAttMaker => {
  /** @type {Store<Address, AttMaker>} */
  const addressToAttMaker = makeStore('address');

  /**
   * @param {Address} address
   * @returns {AttMaker}
   */
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
