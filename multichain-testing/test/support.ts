import type { ExecutionContext } from 'ava';
import { dirname, join } from 'path';
import { makeGetConfigFile, makeSetupRegistry } from '../tools/registry.js';

const setupRegistry = makeSetupRegistry(makeGetConfigFile({ dirname, join }));

export const commonSetup = async (_t?: ExecutionContext) => {
  const { useChain } = await setupRegistry();
  return { useChain };
};
