// TypeScript shim for anylogger so NodeNext resolution picks up the default export.
// Derived from the upstream anylogger v0.21.0 definitions.
declare module 'anylogger' {
  export type BaseLevels = {
    error: 1;
    warn: 2;
    info: 3;
    log: 4;
    debug: 5;
    trace: 6;
  };

  export interface BaseLogger<L extends BaseLevels = BaseLevels> {
    /** The name of this logger. */
    name: string;

    (level: keyof L, message?: any, ...args: any[]): void;
    (message?: any, ...args: any[]): void;

    error(message?: any, ...args: any[]): void;
    warn(message?: any, ...args: any[]): void;
    info(message?: any, ...args: any[]): void;
    log(message?: any, ...args: any[]): void;
    debug(message?: any, ...args: any[]): void;
    trace(message?: any, ...args: any[]): void;
    enabledFor(level: keyof L): boolean;
  }

  export type Logger<L extends BaseLevels = BaseLevels> = BaseLogger<L> & {
    [P in keyof Omit<L, keyof BaseLevels>]: (message?: any, ...args: any[]) => void;
  };

  export interface AnyLogger<
    L extends BaseLevels,
    T extends BaseLogger<L> = Logger<L>,
  > {
    /** Returns an object containing all loggers created so far, keyed by name. */
    (): { [name: string]: T };

    /** Creates or fetches a logger with the given name. */
    (name: string, config?: object | undefined): T;

    /** Mapping of level names to numeric codes. */
    levels: L & { [name: string]: number };

    /** Construct a new logger function that delegates to `anylogger.log`. */
    new (name: string, config?: object | undefined): T;

    /** Log with the given level and data. */
    log(name: string, level: keyof L, message?: any, ...args: any[]): void;
    log(name: string, message?: any, ...args: any[]): void;

    /** Extend an existing logger. */
    ext(logger: T): T;
  }

  const anylogger: AnyLogger<BaseLevels>;

  export default anylogger;
}
