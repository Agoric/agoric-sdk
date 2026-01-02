/**
 * @file Conversion from IBC endpoints to Agoric Network API Endpoints
 * @summary Utilities for constructing and parsing Agoric Network API IBC addresses, which
 *   are used to identify IBC ports and channels in a Cosmos-participating
 *   blockchain.
 *
 *   Agoric Network API addresses are roughly akin to Multiaddrs (@ref
 *   https://github.com/multiformats/js-multiaddr) but with a less rigid
 *   structure. Both share a similar textual representation, which is
 *   encapsulated protocols and values separated by slashes.
 */

/** @typedef {`/${string}ibc-port/${string}/${'ordered' | 'unordered'}/${string}`} RemoteIbcAddress */
/** @typedef {`/ibc-port/${string}`} LocalIbcAddress */

/**
 * @import {IBCChannelID, IBCChannelOrdering,
 *   IBCConnectionID, IBCPortID} from '../src/types.js';
 * @import {Endpoint} from '@agoric/network';
 */

/**
 * @typedef {object} IBCEndpoint
 * @property {IBCConnectionID[]} hops
 * @property {IBCPortID} portID
 * @property {IBCChannelOrdering} [order]
 * @property {string} [version]
 * @property {IBCChannelID} [channelID]
 */

export const IBC_ADDR_RE =
  /^(?<hops>\/ibc-hop\/[^/]+)*\/ibc-port\/(?<portID>[^/]+)(\/(?<order>ordered|unordered)\/(?<version>[^/]+)(\/ibc-channel\/(?<channelID>[^/]+))?)?$/s;
harden(IBC_ADDR_RE);

export const VALID_ORDERS = /** @type {const} */ ([
  'ordered',
  'unordered',
  'ORDERED',
  'UNORDERED',
]);
harden(VALID_ORDERS);

/** @param {string} raw */
export const encodeSlashes = raw => raw.replaceAll('/', '\\x2f');
harden(encodeSlashes);

/** @param {string} encoded */
export const decodeSlashes = encoded => encoded.replaceAll('\\x2f', '/');
harden(decodeSlashes);

export const validateIbcAddress = addr => {
  const match = addr.match(IBC_ADDR_RE);
  // .groups is to inform TS
  if (!(match && match.groups)) {
    throw TypeError(
      `IBC address ${addr} must be '(/ibc-hop/CONNECTION)*/ibc-port/PORT/(ordered|unordered)/VERSION(/ibc-channel/CHANNEL_ID)?'`,
    );
  }
  return match;
};

/**
 * Decode the /ibc-hop/CONNECTION segments of an IBC address.
 *
 * @param {string} h
 * @returns {IBCConnectionID[]}
 */
export const decodeIbcHops = h => {
  /** @type {IBCConnectionID[]} */
  const hops = [];

  /** @type {string} */
  while (h) {
    const m = h.match(/^\/ibc-hop\/(?<hop>[^/]+)/);
    if (!m || !m.groups) {
      throw Error(
        `internal: ${JSON.stringify(h)} did not begin with "/ibc-hop/XXX"`,
      );
    }
    h = h.slice(m[0].length);

    const hop = /** @type {IBCConnectionID} */ (m.groups.hop);
    assert(typeof hop === 'string' && hop.startsWith('connection-'));
    hops.push(hop);
  }

  return hops;
};
harden(decodeIbcHops);

/**
 * @param {string} addr
 * @returns {IBCEndpoint}
 */
export const decodeIbcEndpoint = addr => {
  const match = validateIbcAddress(addr);
  if (!match.groups)
    throw Error('Unexpected error, validateRemoteIbcAddress should throw.');

  const hops = decodeIbcHops(match.groups.hops);

  // Generate a circuit.
  const { portID, version, channelID, order } = match.groups;
  return {
    hops,
    portID,
    ...(order && { order: order.toUpperCase() }),
    ...(version && { version: decodeSlashes(version) }),
    ...(channelID && { channelID }),
  };
};
harden(decodeIbcEndpoint);

/**
 * @param {object} spec
 * @param {string[]} [spec.hops]
 * @param {string} spec.portID
 * @param {'ordered' | 'unordered' | 'ORDERED' | 'UNORDERED'} spec.order
 * @param {string} spec.version
 * @param {string} [spec.channelID]
 * @returns {Endpoint}
 */
export const encodeIbcEndpoint = ({
  hops = [],
  portID,
  order: rawOrder,
  version,
  channelID,
}) => {
  const isLegitString = str =>
    typeof str === 'string' && str && !str.includes('/');
  let addr = '';
  assert(Array.isArray(hops), 'hops must be an array');
  for (const hop of hops) {
    assert(isLegitString(hop), `invalid hop ${hop}`);
    addr += `/ibc-hop/${hop}`;
  }
  assert(isLegitString(portID), `invalid portID ${portID}`);
  addr += `/ibc-port/${portID}`;

  if (rawOrder !== undefined) {
    assert(isLegitString(rawOrder), `invalid order ${rawOrder}`);

    assert(
      VALID_ORDERS.includes(rawOrder),
      `invalid order ${rawOrder}; ${rawOrder} not found in ${JSON.stringify(VALID_ORDERS)}`,
    );

    const order = rawOrder.toLowerCase();

    assert(typeof version === 'string' && version, 'missing version');
    addr += `/${order}/${encodeSlashes(version)}`;

    if (channelID !== undefined) {
      assert(isLegitString(channelID), `invalid channelID ${channelID}`);
      addr += `/ibc-channel/${channelID}`;
    }
  }

  return addr;
};
harden(encodeIbcEndpoint);

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
  const match = validateIbcAddress(remoteAddr);
  // .groups is to inform TS https://github.com/microsoft/TypeScript/issues/32098
  if (!(match && match.groups)) {
    throw TypeError(
      `Remote address ${remoteAddr} must be '(/ibc-hop/CONNECTION)*/ibc-port/PORT/(ordered|unordered)/VERSION'`,
    );
  }
  if (match.groups.channelID) {
    throw TypeError(
      `Remote address ${remoteAddr} must not include channelID; found ${match.groups.channelID}`,
    );
  }
  return returnMatch ? match : true;
};
harden(validateRemoteIbcAddress);

/** @param {string} remoteAddr */
export const decodeRemoteIbcAddress = remoteAddr => {
  validateRemoteIbcAddress(remoteAddr);
  const {
    hops,
    portID: rPortID,
    order,
    version,
  } = decodeIbcEndpoint(remoteAddr);
  assert(order !== undefined, 'missing order');
  assert(version !== undefined, 'missing version');
  return { rPortID, order, version, hops };
};
harden(decodeRemoteIbcAddress);

/**
 * @param {LocalIbcAddress} localAddr
 * @returns {string}
 */
export const localAddrToPortID = localAddr => {
  const m = localAddr.match(IBC_ADDR_RE);
  // .groups is to inform TS https://github.com/microsoft/TypeScript/issues/32098
  if (!(m && m.groups)) {
    throw TypeError(
      `Invalid port specification ${localAddr}; expected "/ibc-port/PORT"`,
    );
  }
  for (const group of Object.keys(m.groups)) {
    if (group === 'portID') {
      continue;
    }
    if (m.groups[group] !== undefined) {
      throw TypeError(
        `Invalid port specification ${localAddr}; unexpected ${group}=${m.groups[group]}`,
      );
    }
  }
  return m.groups.portID;
};
harden(localAddrToPortID);

/**
 * @param {string[]} hops
 * @param {string} portID
 * @param {'ordered' | 'unordered' | 'ORDERED' | 'UNORDERED'} order
 * @param {string} version
 * @param {string} [channelID]
 * @returns {RemoteIbcAddress}
 */
export const encodeRemoteIbcAddress = (
  hops,
  portID,
  order,
  version,
  channelID,
) => {
  const ep = encodeIbcEndpoint({
    hops,
    portID,
    order,
    version,
    ...(channelID && { channelID }),
  });
  return /** @type {RemoteIbcAddress} */ (ep);
};
harden(encodeRemoteIbcAddress);

/**
 * @param {string} portID
 * @param {'ordered' | 'unordered' | 'ORDERED' | 'UNORDERED'} order
 * @param {string} version
 */
export const encodeLocalIbcAddress = (portID, order, version) => {
  return encodeIbcEndpoint({ portID, order, version });
};
harden(encodeLocalIbcAddress);
