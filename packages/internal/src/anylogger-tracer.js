import anylogger from '../vendor/anylogger.js';
import { makeTracer } from './debug.js';

/**
 * @import {Logger} from '../vendor/anylogger.js';
 */

/** @type {typeof anylogger.ext} */
const oldExt = anylogger.ext;

/** @type {typeof anylogger.ext} */
anylogger.ext = (l, opts = {}) => {
  const { enable = true } = opts;
  const logger = oldExt(l, opts);
  let loggerCode;
  switch (enable) {
    case false: {
      // Disable all logging.
      loggerCode = -1;
      break;
    }
    case 'verbose': {
      loggerCode = anylogger.levels.debug;
      break;
    }
    default: {
      loggerCode = anylogger.levels.log;
    }
  }

  // Inherit some behavior directly from the tracer.
  const tracer = makeTracer(l.name, enable);
  logger.sub = (subname, subopts = {}) =>
    anylogger.ext(anylogger.new(`${l.name}.${subname}`), {
      enable,
      ...subopts,
    });

  logger.enabledFor = lvl =>
    lvl !== undefined && loggerCode >= anylogger.levels[lvl];

  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (loggerCode >= code) {
      logger[level] = tracer;
    } else {
      // Disable printing.
      logger[level] = () => {};
    }
  }
  return /** @type {Logger} */ (logger);
};

export default anylogger;
