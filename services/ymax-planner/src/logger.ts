import { AsyncLocalStorage } from 'node:async_hooks';
import type { Console } from 'node:console';

type TraceContext = {
  traceId?: string;
};

const traceStore = new AsyncLocalStorage<TraceContext>();

const tracePrefix = () => {
  const { traceId } = traceStore.getStore() || {};
  return traceId ? `[${traceId}] ` : '';
};

const withPrefix = (args: any[]) => {
  const prefix = tracePrefix();
  return prefix ? [prefix, ...args] : args;
};

/**
 * Run a function within a trace context so downstream async work can reuse the
 * same traceId without needing to thread it through parameters.
 */
export const runWithTrace = async <T>(
  traceId: string,
  fn: () => Promise<T> | T,
): Promise<T> => traceStore.run({ traceId }, fn);

export const runWithFlowTrace = async <T>(
  portfolioKey: string,
  flowKey: string,
  fn: () => Promise<T> | T,
): Promise<T> => {
  const traceId = `${portfolioKey}.${flowKey}`;
  return runWithTrace(traceId, fn);
};

type LogTarget = Pick<Console, 'debug' | 'info' | 'log' | 'warn' | 'error'>;

// Module state to allow swapping out the log target (e.g., for tests).
let logTarget: LogTarget = console;

export const setLogTarget = (target: LogTarget) => {
  logTarget = target;
};

/**
 * Minimal logger that mirrors console.* but prefixes logs with the current
 * traceId from AsyncLocalStorage when present.
 */
export const logger = {
  debug: (...args: any[]) => logTarget.debug(...withPrefix(args)),
  log: (...args: any[]) => logTarget.log(...withPrefix(args)),
  info: (...args: any[]) => logTarget.info(...withPrefix(args)),
  warn: (...args: any[]) => logTarget.warn(...withPrefix(args)),
  error: (...args: any[]) => logTarget.error(...withPrefix(args)),
};

export const getCurrentTraceId = () => traceStore.getStore()?.traceId;
