type Log = (...values: unknown[]) => void;

export const sleep = (ms: number, log: Log = () => {}) =>
  new Promise(resolve => {
    log(`Sleeping for ${ms}ms...`);
    setTimeout(resolve, ms);
  });
