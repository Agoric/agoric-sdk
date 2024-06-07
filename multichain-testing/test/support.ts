import type { ExecutionContext } from 'ava';
import { dirname, join } from 'path';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import * as ambientChildProcess from 'node:child_process';
import * as ambientFsp from 'node:fs/promises';
import { makeE2ETools } from '../tools/e2e-tools.js';
import { makeGetConfigFile, makeSetupRegistry } from '../tools/registry.js';

const setupRegistry = makeSetupRegistry(makeGetConfigFile({ dirname, join }));

const makeAgdTools = async (t: ExecutionContext) => {
  const bundleCache = await makeNodeBundleCache(
    'bundles',
    {},
    (s) => import(s),
  );
  const { writeFile } = ambientFsp;
  const { execFileSync, execFile } = ambientChildProcess;
  const tools = await makeE2ETools(t, bundleCache, {
    execFileSync,
    execFile,
    fetch,
    setTimeout,
    writeFile,
  });
  return tools;
};

export const commonSetup = async (t: ExecutionContext) => {
  const { useChain } = await setupRegistry();
  const tools = await makeAgdTools(t);
  return { useChain, ...tools };
};
