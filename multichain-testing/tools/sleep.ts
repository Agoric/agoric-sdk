import type { LogFn } from 'ava';

export const sleep = (ms: number, log?: LogFn) =>
  new Promise((resolve) => {
    if (log) log(`Sleeping for ${ms}ms...`);
    setTimeout(resolve, ms);
  });
