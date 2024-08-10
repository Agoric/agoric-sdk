const { stringify: jq } = JSON;

/**
 * @file to regenerate
 *   1. set RECORDING=true in interpose-net-access.test.js
 *   2. run: yarn test test/interpose-net-access.test.js --update-snapshots
 *   3. for each map in interpose-net-access.test.js.md, copy it and
 *   4. replace all occurences of => with : and paste as args to Object.fromEntries()
 *   5. change RECORDING back to false
 */
export const web1 = new Map([
  [
    jq([
      'https://emerynet.rpc.agoric.net/',
      {
        method: 'POST',
        body: jq({
          id: 1208387614,
          method: 'no-such-method',
          params: [],
          jsonrpc: '2.0',
        }),
        headers: { 'Content-Type': 'application/json' },
      },
    ]),
    {
      error: {
        code: -32601,
        message: 'Method not found',
      },
      id: 1208387614,
      jsonrpc: '2.0',
    },
  ],
  [
    jq([
      'https://emerynet.rpc.agoric.net/',
      {
        method: 'POST',
        body: jq({
          jsonrpc: '2.0',
          id: 797030719,
          method: 'abci_query',
          params: {
            path: '/cosmos.bank.v1beta1.Query/Balance',
            data: '0a2d61676f726963313430646d6b727a326534326572676a6a37677976656a687a6d6a7a7572767165713832616e67120475697374',
            prove: false,
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      },
    ]),
    {
      id: 797030719,
      jsonrpc: '2.0',
      result: {
        response: {
          code: 0,
          codespace: '',
          height: '123985',
          index: '0',
          info: '',
          key: null,
          log: '',
          proofOps: null,
          value: 'ChAKBHVpc3QSCDI1MDUwMDAw',
        },
      },
    },
  ],
]);

export const web2 = new Map([
  [
    jq([
      'https://emerynet.rpc.agoric.net/',
      {
        method: 'POST',
        body: jq({
          jsonrpc: '2.0',
          id: 1757612624,
          method: 'abci_query',
          params: {
            path: '/agoric.vstorage.Query/Children',
            data: '',
            prove: false,
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      },
    ]),
    {
      id: 1757612624,
      jsonrpc: '2.0',
      result: {
        response: {
          code: 0,
          codespace: '',
          height: '123985',
          index: '0',
          info: '',
          key: null,
          log: '',
          proofOps: null,
          value:
            'CgxhY3Rpdml0eWhhc2gKCmJlYW5zT3dpbmcKBmVncmVzcwoTaGlnaFByaW9yaXR5U2VuZGVycwoJcHVibGlzaGVkCgpzd2luZ1N0b3Jl',
        },
      },
    },
  ],
]);

/**
 * @param {string} str
 * ack: https://stackoverflow.com/a/7616484
 */
const hashCode = str => {
  let hash = 0;
  let i;
  let chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i += 1) {
    chr = str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + chr;
    // eslint-disable-next-line no-bitwise
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

/**
 * Normalize JSON RPC request ID
 *
 * tendermint-rpc generates ids using ambient access to Math.random()
 * So we normalize them to a hash of the rest of the JSON.
 *
 * Earlier, we tried a sequence number, but it was non-deterministic
 * with multiple interleaved requests.
 *
 * @param {string} argsKey
 */
const normalizeID = argsKey => {
  // arbitrary string unlikely to occur in a request. from `pwgen 16 -1`
  const placeholder = 'Ajaz1chei7ohnguv';

  const noid = argsKey.replace(/\\"id\\":\d+/, `\\"id\\":${placeholder}`);
  const id = Math.abs(hashCode(noid));
  return noid.replace(placeholder, `${id}`);
};

/**
 * Wrap `fetch` to capture JSON RPC IO traffic.
 *
 * @param {typeof window.fetch} fetch
 * returns wraped fetch along with a .web map for use with {@link replayIO}
 */
export const captureIO = fetch => {
  const web = new Map();
  /** @type {typeof window.fetch} */
  // @ts-expect-error mock
  const f = async (...args) => {
    const key = normalizeID(JSON.stringify(args));
    const resp = await fetch(...args);
    return {
      json: async () => {
        const data = await resp.json();
        web.set(key, data);
        return data;
      },
    };
  };
  return { fetch: f, web };
};

/**
 * Replay captured JSON RPC IO.
 *
 * @param {Map<string, any>} web map from
 *   JSON-stringified fetch args to fetched JSON data.
 */
export const replayIO = web => {
  /** @type {typeof window.fetch} */
  // @ts-expect-error mock
  const f = async (...args) => {
    const key = normalizeID(JSON.stringify(args));
    const data = web.get(key);
    if (!data) {
      throw Error(`no data for ${key}`);
    }
    return {
      json: async () => data,
    };
  };
  return f;
};
