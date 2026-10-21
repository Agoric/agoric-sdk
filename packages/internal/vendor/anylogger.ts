// @ts-nocheck
/* eslint-disable -- vendored upstream source */
/**
 * VENDORED SOURCE - DO NOT EDIT DIRECTLY
 *
 * Source of truth for the anylogger vendored module.
 *
 * This vendoring flow intentionally keeps three files:
 * - `vendor/anylogger.ts`: upstream TypeScript source (kept close to upstream).
 * - `vendor/anylogger.js`: generated runtime for consumers that import JS directly.
 * - `vendor/anylogger.d.ts`: generated declarations for type imports from that same JS path.
 *
 * To regenerate generated artifacts after editing the TypeScript source file (vendor/anylogger.ts):
 * `cd packages/internal && yarn run -T tsc --project vendor/tsconfig.anylogger.json`
 */
// prettier-ignore-start

/**
 * A log function is a function that takes a variable amount of
 * arguments and returns void.
 */
export type LogFunction = (...args: any) => void;

/**
 * The default base log levels for anylogger.
 */
export type LogLevels = {
  error: 1;
  warn: 2;
  info: 3;
  log: 4;
  debug: 5;
  trace: 6;
};

/**
 * A log level is a string that is a key of `LogLevels`.
 */
export type LogLevel = keyof LogLevels;

/**
 * All loggers, keyed by name.
 */
export type AllLoggers = {
  [name: string]: Logger;
};

/**
 * An alias for the much used concept of a LoggerName.
 */
export type LoggerName = string;

/**
 * An adapter accepts a LogFunction and returns a Logger.
 */
export type Adapter = (logfn: LogFunction) => Logger;

/**
 * A logger is a log function that has a `name` that corresponds to the logger
 * name, a method `enabledFor(level: LogLevel)` to check whether the logger is
 * enabled for a certain log level, and log methods for each of the log levels
 * supported by AnyLogger: `error`, `warn`, `info`, `log`, `debug` and `trace`.
 */
export type Logger = LogFunction & {
  readonly name: LoggerName;
  enabledFor: (level?: LogLevel) => boolean | void;
} & {
  [P in keyof LogLevels as `${P}`]: LogFunction;
};

/**
 * Gets or creates a logger by name.
 */
export type AnyLogger = ((name: LoggerName) => Logger) & {
  /**
   * Stores all loggers created so far.
   */
  all: AllLoggers;

  /**
   * An object containing a mapping of level names to level values.
   */
  levels: { [level: string]: number };

  /**
   * Called when a new logger needs to be created.
   */
  new: (name: LoggerName) => LogFunction;

  /**
   * Called by the log function that the default implementation of
   * `anylogger.new` creates.
   */
  log: (name: LoggerName, ...args: any) => void;

  /**
   * Called when a log function needs to be extended.
   */
  ext: Adapter;
};

/**
 * Back-compat alias used by callers in this repository.
 */
export type BaseLevels = LogLevels;

/**
 *  A  N  Y  L  O  G  G  E  R
 *  Get a logger. Any logger.
 */

// the main `anylogger` function
const anylogger = ((name: LoggerName) =>
  // return the existing logger, or
  anylogger.all[name] ||
  // create and store a new logger with that name
  (anylogger.all[name] = anylogger.ext(anylogger.new(name)))) as AnyLogger;

// all loggers created so far
anylogger.all = Object.create(null);

// the supported levels
anylogger.levels = { error: 1, warn: 2, info: 3, log: 4, debug: 5, trace: 6 };

// creates a new named log function
anylogger.new = name =>
  ({
    // to assign the function `name`, set it to a named key in an object.
    // the default implementation calls `anylogger.log`, which should be a
    // good choice in many cases.
    [name]: (...args: any[]) => anylogger.log(name, ...args),
  })[name]; // return only the function, not the encapsulating object

// logs with the logger with the given `name`
anylogger.log = (name, ...args: any[]) => {
  // select the logger to use
  anylogger.all[name][
    // select the level to use
    // if multiple args and first matches a level name
    args.length > 1 && anylogger.levels[args[0] as string]
      ? (args.shift() as string) // use the level from the args
      : 'log' // else use default level `'log'`
  ](...args); // call method matching level with remaining args
};

// extends the given `logger` function
// the implementation here only adds no-ops
// adapters should change this behavior
anylogger.ext = (logger: LogFunction) => {
  (logger as Logger).enabledFor = () => {};
  for (const method in anylogger.levels) {
    (logger as Logger)[method as LogLevel] = () => {};
  }
  return logger as Logger;
};

// this is a real ESM module
export default anylogger;

// prettier-ignore-end
