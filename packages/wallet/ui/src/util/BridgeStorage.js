import { makeCapTP } from '@endo/captp';
import { E } from '@endo/eventual-send';

export const bridgeStorageMessages = bridge => {
  /** @type {Map<string,[ReturnType<typeof makeCapTP>, number]>} */
  const dappToConn = new Map();

  const handleStorageMessage = (key, newValue) => {
    const keyParts = JSON.parse(key);
    assert(Array.isArray(keyParts));
    const [tag, origin, epoch, _ix] = /** @type {unknown[]} */ (keyParts);
    const payload = JSON.parse(newValue);
    if (tag !== 'out' || !payload || typeof payload.type !== 'string') {
      return;
    }

    const obj = {
      ...payload,
      dappOrigin: origin,
    };
    const dappKey = JSON.stringify([origin, epoch]);
    /** @type {ReturnType<typeof makeCapTP>}  */
    let conn;
    /** @type {number} */
    let ix;
    if (dappToConn.has(dappKey)) {
      [conn, ix] = dappToConn.get(dappKey) || assert.fail();
    } else {
      /** @param {unknown} payloadOut */
      const send = payloadOut => {
        console.debug('WalletConnect: message -> storage', payloadOut);
        window.localStorage.setItem(
          JSON.stringify(['in', origin, epoch, ix]),
          JSON.stringify(payloadOut),
        );
        ix += 1; // ISSUE: overflow?
      };
      const makeBoot = () => E(bridge).getScopedBridge(origin, origin);
      console.debug('new capTP connection', { origin, epoch });
      conn = makeCapTP(`from ${origin} at ${epoch}`, send, makeBoot);
      ix = 0;
    }
    dappToConn.set(dappKey, [conn, ix + 1]);
    console.debug('WalletConnect: storage -> dispatch', obj);
    conn.dispatch(obj);
    window.localStorage.removeItem(key);
  };

  const storageListener = ev => {
    const { key, newValue } = ev;
    // removeItem causes an event where newValue is null
    if (key && newValue) {
      handleStorageMessage(key, newValue);
    }
  };
  window.addEventListener('storage', storageListener);

  return () => {
    window.removeEventListener('storage', storageListener);
    for (const [conn, _ix] of dappToConn.values()) {
      // @ts-expect-error capTP abort has wrong type?
      conn.abort(Error('wallet connection cancelled'));
    }
  };
};
