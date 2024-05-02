export const REMOTE_ADDR_RE =
  /^(?<hops>\/ibc-hop\/[^/]+)*\/ibc-port\/(?<portID>[^/]+)\/(?<order>ordered|unordered)\/(?<version>[^/]+)$/s;
harden(REMOTE_ADDR_RE);
/** @typedef {`/${string}ibc-port/${string}/${'ordered' | 'unordered'}/${string}`} RemoteIbcAddress */

export const LOCAL_ADDR_RE = /^\/ibc-port\/(?<portID>[-a-zA-Z0-9._+#[\]<>]+)$/;
/** @typedef {`/ibc-port/${string}`} LocalIbcAddress */

/**
 * @overload
 * @param {string} remoteAddr
 * @param {undefined | false} [returnMatch]
 * @returns {boolean}
 */
/**
 * @overload
 * @param {string} remoteAddr
 * @param {true} returnMatch
 * @returns {RegExpMatchArray}
 */
/**
 * Validates a remote IBC address format and returns true if the address is
 * valid.
 *
 * @param {string} remoteAddr
 * @param {boolean} [returnMatch]
 */
export const validateRemoteIbcAddress = (remoteAddr, returnMatch = false) => {
  const match = remoteAddr.match(REMOTE_ADDR_RE);
  // .groups is to inform TS https://github.com/microsoft/TypeScript/issues/32098
  if (!(match && match.groups)) {
    throw TypeError(
      `Remote address ${remoteAddr} must be '(/ibc-hop/CONNECTION)*/ibc-port/PORT/(ordered|unordered)/VERSION'`,
    );
  }
  return returnMatch ? match : true;
};

/** @param {string} remoteAddr */
export const decodeRemoteIbcAddress = remoteAddr => {
  const match = validateRemoteIbcAddress(remoteAddr, true);
  if (!match.groups)
    throw Error('Unexpected error, validateRemoteIbcAddress should throw.');

  /** @type {import('../src/types.js').IBCConnectionID[]} */
  const hops = [];

  let h = match.groups.hops;
  while (h) {
    const m = h.match(/^\/ibc-hop\/(?<hop>[^/]+)/);
    if (!m) {
      throw Error(
        `internal: ${JSON.stringify(h)} did not begin with "/ibc-hop/XXX"`,
      );
    }
    h = h.substr(m[0].length);
    // @ts-expect-error unchecked cast
    hops.push(m.groups.hop);
  }
  // Generate a circuit.
  const { portID: rPortID, version } = match.groups;
  /** @type {import('../src/types.js').IBCChannelOrdering} */
  const order = match.groups.order === 'ordered' ? 'ORDERED' : 'UNORDERED';
  return { rPortID, hops, order, version };
};
harden(decodeRemoteIbcAddress);

/**
 * @param {LocalIbcAddress} localAddr
 * @returns {string}
 */
export const localAddrToPortID = localAddr => {
  const m = localAddr.match(LOCAL_ADDR_RE);
  // .groups is to inform TS https://github.com/microsoft/TypeScript/issues/32098
  if (!(m && m.groups)) {
    throw TypeError(
      `Invalid port specification ${localAddr}; expected "/ibc-port/PORT"`,
    );
  }
  return m.groups.portID;
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
