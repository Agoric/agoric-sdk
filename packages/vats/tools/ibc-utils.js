export const REMOTE_ADDR_RE =
  /^(\/ibc-hop\/[^/]+)*\/ibc-port\/([^/]+)\/(ordered|unordered)\/([^/]+)$/s;
harden(REMOTE_ADDR_RE);
/** @typedef {`/${string}ibc-port/${string}/${'ordered' | 'unordered'}/${string}`} RemoteIbcAddress */

export const LOCAL_ADDR_RE = /^\/ibc-port\/([-a-zA-Z0-9._+#[\]<>]+)$/;
harden(LOCAL_ADDR_RE);
/** @typedef {`/ibc-port/${string}`} LocalIbcAddress */

/** @param {string} remoteAddr */
export const decodeRemoteIbcAddress = remoteAddr => {
  const match = remoteAddr.match(
    /^(\/ibc-hop\/[^/]+)*\/ibc-port\/([^/]+)\/(ordered|unordered)\/([^/]+)$/s,
  );
  if (!match) {
    throw TypeError(
      `Remote address ${remoteAddr} must be '(/ibc-hop/CONNECTION)*/ibc-port/PORT/(ordered|unordered)/VERSION'`,
    );
  }

  /** @type {import('../src/types.js').IBCConnectionID[]} */
  const hops = [];
  let h = match[1];
  while (h) {
    const m = h.match(/^\/ibc-hop\/([^/]+)/);
    if (!m) {
      throw Error(
        `internal: ${JSON.stringify(h)} did not begin with "/ibc-hop/XXX"`,
      );
    }
    h = h.substr(m[0].length);
    // @ts-expect-error unchecked cast
    hops.push(m[1]);
  }

  // Generate a circuit.
  const rPortID = match[2];
  /** @type {import('../src/types.js').IBCChannelOrdering} */
  const order = match[3] === 'ordered' ? 'ORDERED' : 'UNORDERED';
  const version = match[4];

  return { rPortID, hops, order, version };
};
harden(decodeRemoteIbcAddress);

/**
 * @param {LocalIbcAddress} localAddr
 * @returns {string}
 */
export const localAddrToPortID = localAddr => {
  const m = localAddr.match(LOCAL_ADDR_RE);
  if (!m) {
    throw TypeError(
      `Invalid port specification ${localAddr}; expected "/ibc-port/PORT"`,
    );
  }
  return m[1];
};
harden(localAddrToPortID);

/**
 * @param {string[]} hops
 * @param {string} rPortID
 * @param {'ordered' | 'unordered' | 'ORDERED' | 'UNORDERED'} order
 * @param {string} rVersion
 * @param {string} rChannelID
 * @returns {RemoteIbcAddress}
 */
export const encodeRemoteIbcAddress = (
  hops,
  rPortID,
  order,
  rVersion,
  rChannelID,
) => {
  const ibcHops = hops.map(hop => `/ibc-hop/${hop}`).join('/');
  return /** @type {RemoteIbcAddress} */ (
    `${ibcHops}/ibc-port/${rPortID}/${order.toLowerCase()}/${rVersion}/ibc-channel/${rChannelID}`
  );
};
harden(encodeRemoteIbcAddress);

/**
 * @param {string} portID
 * @param {'ordered' | 'unordered' | 'ORDERED' | 'UNORDERED'} order
 * @param {string} version
 */
export const encodeLocalIbcAddress = (portID, order, version) => {
  return `/ibc-port/${portID}/${order.toLowerCase()}/${version}`;
};

harden(encodeLocalIbcAddress);
