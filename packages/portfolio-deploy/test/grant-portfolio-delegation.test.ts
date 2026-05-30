import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { main } from '../scripts/grant-portfolio-delegation.ts';

test('grant script waits for wallet invocation completion', async t => {
  const nonce = '2026-05-30T12:34:56.000Z';
  const id = `handleMessage.${nonce}`;
  const updates = [
    { updated: 'invocation', id: 'other-id', result: 'ignore me' },
    { updated: 'invocation', id },
    {
      updated: 'invocation',
      id,
      result: 'granted',
    },
  ];
  let updateCalls = 0;
  let sendCalled = false;
  const fakeSetTimeout = Object.assign(
    (fn: (...args: any[]) => void, _ms?: number) => {
      fn();
      return 0 as any;
    },
    { __promisify__: async (_ms: number) => {} },
  ) as typeof globalThis.setTimeout;

  await main(
    [
      'node',
      'grant-portfolio-delegation.ts',
      '--portfolio',
      '95',
      '--account-holder',
      'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a',
    ],
    {
      AGORIC_NET: 'main',
      TRADER_KEY:
        '0x1111111111111111111111111111111111111111111111111111111111111111',
      EMS_KEY: 'test mnemonic',
    },
    {
      fetch: async () => {
        throw Error('unexpected fetch');
      },
      setTimeout: fakeSetTimeout,
      randomBytes: () => new Uint8Array(8),
      makeNonce: () => nonce,
      fetchEnvNetworkConfigImpl: async () => ({
        chainName: 'agoric',
        rpcAddrs: ['http://127.0.0.1:26657'],
      }),
      makeSmartWalletKitImpl: async () => ({}) as any,
      makeSigningSmartWalletKitImpl: async () =>
        ({
          sendBridgeAction: async () => {
            sendCalled = true;
            return { code: 0, transactionHash: 'abc123', height: 77 };
          },
          query: {
            getLastUpdate: async () => {
              updateCalls += 1;
              return harden(updates.shift() || updates.at(-1)!);
            },
          },
        }) as any,
    },
  );

  t.true(sendCalled);
  t.is(updateCalls, 3);
});
