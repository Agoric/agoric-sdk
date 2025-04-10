import { makeE2ETools } from './e2e-tools.js';

export const makeAgdTools = async (
  networkConfig: { chainName: string; rpcAddrs: string[]; apiAddrs: string[] },
  log: typeof console.log,
  {
    execFile,
    execFileSync,
  }: Pick<typeof import('child_process'), 'execFile' | 'execFileSync'>,
) => {
  const tools = await makeE2ETools(networkConfig, log, {
    execFileSync,
    execFile,
    fetch,
    setTimeout,
  });
  return tools;
};

export type AgdTools = Awaited<ReturnType<typeof makeAgdTools>>;
