// @ts-check
import { test } from '../tools/prepare-test-env-ava.js';
import { makeVatConsole } from '../src/supervisors/supervisor-helper.js';

test('makeVatConsole is suitable for vat console endowment', t => {
  const logged = [];

  /** @type {(level: string) => (...args: any[]) => void} */
  const makeLog =
    level =>
    (...args) =>
      logged.push({ level, args });

  const endowments = { console: makeVatConsole(makeLog) };

  endowments.console.log('Hello, world!');
  t.deepEqual(logged, [
    {
      args: ['Hello, world!'],
      level: 'log',
    },
  ]);

  // @ts-expect-error deliberate type error
  t.throws(() => endowments.console.trace('Hello, world!'));
});

test('makeVatConsole can suppress by log level', t => {
  const logged = [];

  /** @type {(level: string) => (...args: any[]) => void} */
  const makeLog =
    level =>
    (...args) =>
      logged.push({ level, args });

  const endowments = { console: makeVatConsole(makeLog, 'warn') };

  endowments.console.log('Hello, world!');
  endowments.console.info('Temp is 72F.');
  endowments.console.warn('Look out!');
  endowments.console.error(`Sorry Dave, I'm afraid I can't do that.`);
  t.deepEqual(logged, [
    {
      args: ['Look out!'],
      level: 'warn',
    },
    {
      args: [`Sorry Dave, I'm afraid I can't do that.`],
      level: 'error',
    },
  ]);
});
