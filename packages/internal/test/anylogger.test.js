// @ts-nocheck
import test from 'ava';

import anylogger from '../vendor/anylogger.js';

const levels = Object.keys(anylogger.levels);

const applyNoopExt = () => {
  anylogger.ext = logger => {
    logger.enabledFor = () => {};
    for (const method of levels) {
      logger[method] = () => {};
    }
    return logger;
  };
};

const resetAnylogger = () => {
  anylogger.all = Object.create(null);
  applyNoopExt();
};

test.beforeEach(() => {
  resetAnylogger();
});

test.afterEach(() => {
  resetAnylogger();
});

test('anylogger default extension is silent', t => {
  const calls = [];
  const logger = anylogger('snapshot:default');

  logger('plain call');
  logger('warn', 'warn call');
  logger.info('info call');
  logger.debug('debug call');

  t.snapshot({
    levels,
    methodTypes: Object.fromEntries(
      levels.map(level => [level, typeof logger[level]]),
    ),
    enabledForLog: logger.enabledFor('log'),
    calls,
  });
});

test('anylogger console adapter behaves like pre-vendor defaults', t => {
  const calls = [];
  const enabledLevels = new Set(['error', 'warn', 'info', 'log']);

  anylogger.ext = logger => {
    logger.enabledFor = level => enabledLevels.has(level);
    for (const level of levels) {
      logger[level] = (...args) => {
        if (enabledLevels.has(level)) {
          calls.push([level, ...args]);
        }
      };
    }
    return logger;
  };

  const logger = anylogger('snapshot:legacy-like');

  logger('plain call');
  logger('warn', 'warn call');
  logger.info('info call');
  logger.debug('debug call');

  t.snapshot({
    enabledFor: Object.fromEntries(
      levels.map(level => [level, logger.enabledFor(level)]),
    ),
    calls,
  });
});
