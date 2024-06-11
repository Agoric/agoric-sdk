import type { LogFn } from 'ava';

type NoOpFn = () => void;

export const sleep = (ms: number, log: LogFn | NoOpFn = () => {}) =>
  new Promise(resolve => {
    log(`Sleeping for ${ms}ms...`);
    setTimeout(resolve, ms);
  });
