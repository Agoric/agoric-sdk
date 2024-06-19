import { makeNodeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeE2ETools } from './e2e-tools.js';

export const makeAgdTools = async (
  log: typeof console.log,
  {
    execFile,
    execFileSync,
  }: Pick<typeof import('child_process'), 'execFile' | 'execFileSync'>,
) => {
  const bundleCache = makeNodeBundleCache(
    'bundles',
    {},
    (s: string) => import(s),
  );
  const tools = await makeE2ETools(log, bundleCache, {
    execFileSync,
    execFile,
    fetch,
    setTimeout,
  });
  return tools;
};

export type AgdTools = Awaited<ReturnType<typeof makeAgdTools>>;
