// @ts-nocheck
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
 *  A  N  Y  L  O  G  G  E  R
 *  Get a logger. Any logger.
 */
// the main `anylogger` function
const anylogger = ((name) => 
// return the existing logger, or
anylogger.all[name] ||
    // create and store a new logger with that name
    (anylogger.all[name] = anylogger.ext(anylogger.new(name))));
// all loggers created so far
anylogger.all = Object.create(null);
// the supported levels
anylogger.levels = { error: 1, warn: 2, info: 3, log: 4, debug: 5, trace: 6 };
// creates a new named log function
anylogger.new = name => ({
    // to assign the function `name`, set it to a named key in an object.
    // the default implementation calls `anylogger.log`, which should be a
    // good choice in many cases.
    [name]: (...args) => anylogger.log(name, ...args),
})[name]; // return only the function, not the encapsulating object
// logs with the logger with the given `name`
anylogger.log = (name, ...args) => {
    // select the logger to use
    anylogger.all[name][
    // select the level to use
    // if multiple args and first matches a level name
    args.length > 1 && anylogger.levels[args[0]]
        ? args.shift() // use the level from the args
        : 'log' // else use default level `'log'`
    ](...args); // call method matching level with remaining args
};
// extends the given `logger` function
// the implementation here only adds no-ops
// adapters should change this behavior
anylogger.ext = (logger) => {
    logger.enabledFor = () => { };
    for (const method in anylogger.levels) {
        logger[method] = () => { };
    }
    return logger;
};
// this is a real ESM module
export default anylogger;
// prettier-ignore-end
