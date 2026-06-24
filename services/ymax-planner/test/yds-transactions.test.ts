import test from 'ava';

import {
  makePlannerAgentOptions,
  YdsTransactions,
} from '../src/yds-transactions.ts';

const txHash = `0x${'a'.repeat(64)}`;

test('makePlannerAgentOptions uses trimmed nonce as agentMemo', t => {
  t.deepEqual(
    makePlannerAgentOptions(() => '  memo-123  '),
    {
      agentMemo: 'memo-123',
    },
  );
});

test('makePlannerAgentOptions rejects empty nonce', t => {
  t.throws(() => makePlannerAgentOptions(() => '   '), {
    message: 'makeNonce returned an empty agentMemo',
  });
});

test('YdsTransactions posts transaction endpoint with auth', async t => {
  const calls: Array<{
    url: string;
    headers: Headers;
    body: unknown;
  }> = [];
  const logs: unknown[][] = [];
  const ydsTransactions = new YdsTransactions(
    {
      fetch: async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        const headers = new Headers(
          input instanceof Request ? input.headers : init?.headers,
        );
        const request = input instanceof Request ? input : undefined;
        const bodyText = request
          ? await request.text()
          : (init?.body as string);
        calls.push({
          url,
          headers,
          body: JSON.parse(bodyText),
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        });
      },
      log: (...args) => logs.push(args),
    },
    {
      ydsUrl: 'https://yds.example.test/api',
      ydsApiKey: 'secret',
      retries: 0,
    },
  );

  const ok = await ydsTransactions.postTransaction({
    txHash,
    chain: 'agoric-3',
    ymaxInstance: 'ymax0',
    agentMemo: 'memo-123',
  });

  t.true(ok);
  t.is(calls.length, 1);
  t.is(calls[0].url, 'https://yds.example.test/api/transactions');
  t.is(calls[0].headers.get('x-resolver-auth-key'), 'secret');
  t.is(calls[0].headers.get('user-agent'), 'Agoric-YMax-Planner/1.0.0');
  t.deepEqual(calls[0].body, {
    txHash,
    chain: 'agoric-3',
    ymaxInstance: 'ymax0',
    agentMemo: 'memo-123',
  });
  t.true(String(logs[0]?.[0]).includes(`Sending transaction ${txHash}`));
  t.true(
    String(logs[1]?.[0]).includes(`Successfully sent transaction ${txHash}`),
  );
});

test('YdsTransactions returns false and logs when YDS rejects request', async t => {
  const logs: unknown[][] = [];
  const ydsTransactions = new YdsTransactions(
    {
      fetch: async () => new Response('nope', { status: 500 }),
      log: (...args) => logs.push(args),
    },
    {
      ydsUrl: 'https://yds.example.test/api',
      ydsApiKey: 'secret',
      retries: 0,
    },
  );

  const ok = await ydsTransactions.postTransaction({
    txHash,
    chain: 'agoric-3',
    ymaxInstance: 'ymax0',
    agentMemo: 'memo-123',
  });

  t.false(ok);
  t.true(
    String(logs.at(-1)?.[0]).includes(`Failed to send transaction ${txHash}`),
  );
});

test('YdsTransactions validates required transaction data', async t => {
  const ydsTransactions = new YdsTransactions(
    {
      fetch: async () => t.fail('fetch should not be called') as never,
    },
    {
      ydsUrl: 'https://yds.example.test/api',
      ydsApiKey: 'secret',
      retries: 0,
    },
  );

  await t.throwsAsync(
    () =>
      ydsTransactions.postTransaction({
        txHash: 'ABC123',
        chain: 'agoric-3',
        ymaxInstance: 'ymax0',
        agentMemo: 'memo-123',
      }),
    { message: 'txHash must be a 0x-prefixed hex64 value' },
  );
  await t.throwsAsync(
    () =>
      ydsTransactions.postTransaction({
        txHash,
        chain: '',
        ymaxInstance: 'ymax0',
        agentMemo: 'memo-123',
      }),
    { message: 'chain is required' },
  );
  await t.throwsAsync(
    () =>
      ydsTransactions.postTransaction({
        txHash,
        chain: 'agoric-3',
        ymaxInstance: '',
        agentMemo: 'memo-123',
      }),
    { message: 'ymaxInstance is required' },
  );
  await t.throwsAsync(
    () =>
      ydsTransactions.postTransaction({
        txHash,
        chain: 'agoric-3',
        ymaxInstance: 'ymax0',
        agentMemo: '',
      }),
    { message: 'agentMemo is required' },
  );
});
