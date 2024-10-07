import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeE2ETools } from './e2e-tools.js';
import type { ExecAsync, ExecSync } from './agd-lib.js';

export const makeAgdTools = async (
  log: typeof console.log,
  {
    execFileSync,
    delay,
    fetch = globalThis.fetch,
    execFileAsync,
  }: {
    execFileSync: ExecSync;
    delay?: (ms: number) => Promise<void>;
    fetch?: typeof globalThis.fetch;
    execFileAsync?: ExecAsync;
  },
) => {
  const bundleCache = await unsafeMakeBundleCache('bundles');
  const tools = await makeE2ETools(log, bundleCache, {
    execFileSync,
    execFileAsync,
    fetch,
    setTimeout,
    delay,
  });
  return tools;
};

export type AgdTools = Awaited<ReturnType<typeof makeAgdTools>>;
