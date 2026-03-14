import test from 'ava';

import anylogger from '../vendor/anylogger.js';
import { parseDebugEnv } from '../src/debug-env.js';

test('defaults to log when DEBUG is unset', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'unset',
    debugList: [],
  });

  t.is(parsed.debugValue, 'unset');
  t.deepEqual(parsed.debugList, []);
  t.is(parsed.maxActiveLevel, 'log');
  t.is(parsed.maxActiveLevelCode, anylogger.levels.log);
  t.true(parsed.enabledFor('log'));
  t.false(parsed.enabledFor('debug'));
});

test('defaults to info when DEBUG is empty', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: '',
    debugList: [],
  });

  t.is(parsed.maxActiveLevel, 'info');
  t.is(parsed.maxActiveLevelCode, anylogger.levels.info);
  t.true(parsed.enabledFor('info'));
  t.false(parsed.enabledFor('log'));
});

test('bare selector prefix aliases to debug', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'agoric',
    debugList: ['agoric'],
  });

  t.is(parsed.maxActiveLevel, 'debug');
  t.is(parsed.maxActiveLevelCode, anylogger.levels.debug);
  t.true(parsed.enabledFor('debug'));
});

test('agoric:none disables logging via unknown level lookup', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'agoric:none',
    debugList: ['agoric:none'],
  });

  t.is(parsed.maxActiveLevel, 'none');
  t.is(parsed.maxActiveLevelCode, -Infinity);
  t.false(parsed.enabledFor('error'));
});

test('last matching selector wins and ignores non-matching prefixes', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'foo:trace,agoric:warn,other,agoric:info',
    debugList: ['foo:trace', 'agoric:warn', 'other', 'agoric:info'],
  });

  t.is(parsed.maxActiveLevel, 'info');
  t.is(parsed.maxActiveLevelCode, anylogger.levels.info);
  t.true(parsed.enabledFor('info'));
  t.false(parsed.enabledFor('log'));
});

test('full suffix parsing disables malformed matching selectors', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'agoric:debug:extra',
    debugList: ['agoric:debug:extra'],
  });

  t.is(parsed.maxActiveLevel, 'debug:extra');
  t.is(parsed.maxActiveLevelCode, -Infinity);
  t.false(parsed.enabledFor('error'));
});

test('supports non-default selector prefixes', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'custom',
    debugList: ['custom'],
    selectorPrefix: 'custom',
  });

  t.is(parsed.maxActiveLevel, 'debug');
  t.is(parsed.maxActiveLevelCode, anylogger.levels.debug);
  t.true(parsed.enabledFor('debug'));
});

test('suppresses runtime loggers by default', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'unset',
    debugList: [],
  });

  t.true(parsed.isSuppressedLogger('SwingSet:vat:bootstrap'));
  t.true(parsed.isSuppressedLogger('SwingSet:ls:v1'));
  t.false(parsed.isSuppressedLogger('agoric:cli'));
});

test('matching raw prefix selectors unsuppress runtime loggers', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'SwingSet:vat',
    debugList: ['SwingSet:vat'],
  });

  t.false(parsed.isSuppressedLogger('SwingSet:vat:bootstrap'));
  t.true(parsed.isSuppressedLogger('SwingSet:ls:v1'));
});

test('plain agoric selector does not unsuppress runtime loggers', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'agoric',
    debugList: ['agoric'],
  });

  t.true(parsed.isSuppressedLogger('SwingSet:vat:bootstrap'));
});

test('supports non-default suppressed prefixes', t => {
  const parsed = parseDebugEnv(anylogger.levels, {
    debugValue: 'custom:subsystem',
    debugList: ['custom:subsystem'],
    suppressedPrefixes: ['custom:subsystem'],
  });

  t.false(parsed.isSuppressedLogger('custom:subsystem:child'));
  t.false(parsed.isSuppressedLogger('SwingSet:vat:bootstrap'));
});
