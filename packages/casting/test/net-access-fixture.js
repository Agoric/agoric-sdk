const { stringify: jq } = JSON;

export const web1 = new Map([
  [
    jq([
      'https://emerynet.rpc.agoric.net/',
      {
        method: 'POST',
        body: jq({
          id: 1,
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
          id: 2,
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
          id: 1,
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
 * capture JSON RPC IO traffic
 *
 * This was used to generate the fixtures above.
 *
 * @param {typeof window.fetch} fetch
 */
export const captureIO = fetch => {
  const web = new Map();
  /** @type {typeof window.fetch} */
  // @ts-expect-error mock
  const f = async (...args) => {
    const key = JSON.stringify(args);
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
