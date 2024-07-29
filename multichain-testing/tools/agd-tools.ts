import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeE2ETools } from './e2e-tools.js';

export const makeAgdTools = async (
  log: typeof console.log,
  {
    execFile,
    execFileSync,
  }: Pick<typeof import('child_process'), 'execFile' | 'execFileSync'>,
  agoricChainId: string,
  rpcAddress: string,
  apiAddress: string,
) => {
  const bundleCache = await unsafeMakeBundleCache('bundles');
  const tools = await makeE2ETools(log, bundleCache, {
    execFileSync,
    execFile,
    fetch,
    setTimeout,
    rpcAddress,
    apiAddress,
  }, agoricChainId);
  return tools;
};

export type AgdTools = Awaited<ReturnType<typeof makeAgdTools>>;
