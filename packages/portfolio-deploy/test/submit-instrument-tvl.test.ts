import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import submitInstrumentTvl, {
  parseSubmitInstrumentTvlArgs,
} from '../src/submit-instrument-tvl.ts';

test('parse instrument TVL submission', t => {
  t.deepEqual(
    parseSubmitInstrumentTvlArgs([
      'ymax0',
      '--pool-key',
      'Aave_Base',
      '--tvl-usd',
      '12345679',
      '--as-of',
      '1786123456',
    ]),
    {
      contract: 'ymax0',
      poolKey: 'Aave_Base',
      tvlUsd: 12_345_679n,
      asOf: 1_786_123_456,
    },
  );
  t.is(
    parseSubmitInstrumentTvlArgs([
      'ymax1',
      '--pool-key',
      'Aave_Base',
      '--tvl-usd',
      '1',
      '--as-of',
      '1',
    ]).contract,
    'ymax1',
  );
});

test('reject invalid instrument TVL submission arguments', t => {
  const base = [
    'ymax0',
    '--pool-key',
    'Aave_Base',
    '--tvl-usd',
    '12345679',
    '--as-of',
    '1786123456',
  ];
  t.throws(() => parseSubmitInstrumentTvlArgs(base.with(0, 'other')), {
    message: /submit-instrument-tvl/,
  });
  t.throws(() => parseSubmitInstrumentTvlArgs(base.with(2, 'Unknown_Base')), {
    message: /unregistered instrument/,
  });
  t.throws(
    () => parseSubmitInstrumentTvlArgs(base.toSpliced(3, 2, '--tvl-usd=-1')),
    { message: /non-negative integer/ },
  );
  t.throws(
    () =>
      parseSubmitInstrumentTvlArgs(
        base.with(6, String(Number.MAX_SAFE_INTEGER + 1)),
      ),
    { message: /safe integer/ },
  );
});

test('submit instrument TVL invokes the saved oracle entry', async t => {
  const events: unknown[] = [];
  const oracle = {
    submitTvlUpdate: async (...args: unknown[]) => {
      events.push(['submitTvlUpdate', ...args]);
      return { id: 'submission-id', tx: { code: 0 } };
    },
  };
  const tools = {
    scriptArgs: [
      'ymax0',
      '--pool-key',
      'Aave_Base',
      '--tvl-usd',
      '12345679',
      '--as-of',
      '1786123456',
    ],
    makeAccount: async (name: string) => {
      events.push(['account', name]);
      return {
        store: {
          get: (key: string) => {
            events.push(['get', key]);
            return oracle;
          },
        },
      };
    },
  } as never;

  await submitInstrumentTvl(tools);

  t.deepEqual(events, [
    ['account', 'YMAX0_INSTRUMENT_ORACLE'],
    ['get', 'instrumentOracle'],
    ['submitTvlUpdate', 'Aave_Base', 12_345_679n, 1_786_123_456],
  ]);
});

test('submit instrument TVL selects the ymax1 operator account', async t => {
  const accounts: string[] = [];
  const tools = {
    scriptArgs: [
      'ymax1',
      '--pool-key',
      'Aave_Base',
      '--tvl-usd',
      '1',
      '--as-of',
      '1',
    ],
    makeAccount: async (name: string) => {
      accounts.push(name);
      return {
        store: {
          get: () => ({ submitTvlUpdate: async () => undefined }),
        },
      };
    },
  } as never;

  await submitInstrumentTvl(tools);

  t.deepEqual(accounts, ['YMAX1_INSTRUMENT_ORACLE']);
});
