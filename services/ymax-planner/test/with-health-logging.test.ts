import test from 'ava';
import type { ExecutionContext } from 'ava';

import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import { makeHealthLogger } from '../src/main.ts';

type LogEntry = { level: 'log' | 'warn' | 'error'; args: unknown[] };
const makeHealthLoggingKit = () => {
  const output: LogEntry[] = [];
  const withHealthLogging = makeHealthLogger({
    warn: (...args) => {
      output.push({ level: 'warn', args });
    },
    error: (...args) => {
      output.push({ level: 'error', args });
    },
  });
  return { withHealthLogging, output };
};

const assertResultAndLogs = async (
  t: ExecutionContext,
  message: string,
  promise: Promise<unknown>,
  expected: unknown,
  getLogs: () => LogEntry[],
  expectedLogs: LogEntry[],
) => {
  t.is(await promise, expected, `${message} result`);
  const logs = getLogs();
  arrayIsLike(t, logs, expectedLogs, `${message} logs`);
};

test('withHealthLogging logs status by key', async t => {
  const { withHealthLogging, output } = makeHealthLoggingKit();

  const result = 'result';
  const goodP = Promise.resolve(result);
  const err = Error('description');
  const badP = Promise.reject(err);

  await assertResultAndLogs(
    t,
    'good initialization',
    withHealthLogging('foo', goodP),
    result,
    () => output.splice(0),
    [],
  );

  await assertResultAndLogs(
    t,
    'bad initialization',
    withHealthLogging('bar', badP),
    undefined,
    () => output.splice(0),
    [
      {
        level: 'error',
        args: ['🚨 Failed to initialize bar: [Error] description', err],
      },
    ],
  );

  await assertResultAndLogs(
    t,
    'bad initialization recovery',
    withHealthLogging('bar', goodP),
    result,
    () => output.splice(0),
    [
      {
        level: 'warn',
        args: ['Recovered bar'],
      },
    ],
  );

  await assertResultAndLogs(
    t,
    'update failure',
    withHealthLogging('foo', badP),
    undefined,
    () => output.splice(0),
    [
      {
        level: 'error',
        args: ['⚠️ Failed to update foo: [Error] description', err],
      },
    ],
  );

  await assertResultAndLogs(
    t,
    'interleaved success',
    withHealthLogging('bar', goodP),
    result,
    () => output.splice(0),
    [],
  );

  await assertResultAndLogs(
    t,
    'bad update recovery',
    withHealthLogging('foo', goodP),
    result,
    () => output.splice(0),
    [{ level: 'warn', args: ['Recovered foo'] }],
  );

  t.is(await withHealthLogging('foo', goodP), result);
  t.is(await withHealthLogging('bar', goodP), result);
  t.is(await withHealthLogging('bar', goodP), result);
  t.is(await withHealthLogging('foo', goodP), result);
  arrayIsLike(t, output, [], 'steady-state is quiet');
});

test('withHealthLogging failure logs include context', async t => {
  const { withHealthLogging, output } = makeHealthLoggingKit();

  const result = 'result';
  const goodP = Promise.resolve(result);
  const err = Error('description');
  const badP = Promise.reject(err);
  const logContext = {};

  await assertResultAndLogs(
    t,
    'bad initialization',
    withHealthLogging('foo', badP, logContext),
    undefined,
    () => output.splice(0),
    [
      {
        level: 'error',
        args: [
          '🚨 Failed to initialize foo: [Error] description',
          logContext,
          err,
        ],
      },
    ],
  );

  await withHealthLogging('bar', goodP, logContext);
  await assertResultAndLogs(
    t,
    'bad update',
    withHealthLogging('bar', badP, logContext),
    undefined,
    () => output.splice(0),
    [
      {
        level: 'error',
        args: ['⚠️ Failed to update bar: [Error] description', logContext, err],
      },
    ],
  );

  await withHealthLogging('foo', goodP, logContext);
  await withHealthLogging('bar', goodP, logContext);
  arrayIsLike(
    t,
    output,
    [
      { level: 'warn', args: ['Recovered foo'] },
      { level: 'warn', args: ['Recovered bar'] },
    ],
    'recovery messages do not include context',
  );
});
