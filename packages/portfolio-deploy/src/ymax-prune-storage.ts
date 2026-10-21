/** @file prune ymax-related chain storage via ymaxControl */
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';
import { getYmaxControlKit } from './ymax-admin-helpers.ts';

const options = {
  contract: { type: 'string', default: 'ymax0' },
  input: { type: 'string' },
} as const;

const pruneStorage = async ({ scriptArgs, makeAccount, cwd }: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const { contract, input } = values;
  if (!input) throw Error('--input missing');
  const toPrune = await cwd.readOnly().join(input).readJSON();
  const { ymaxControl } = await getYmaxControlKit(makeAccount, contract);

  const batchSize = 50;
  const es = Object.entries(toPrune as Record<string, string[]>);
  for (let i = 0; i < es.length; i += batchSize) {
    const batch = es.slice(i, i + batchSize);
    console.error(`pruning ${batch.length} keys from ${contract}...`);
    await ymaxControl.pruneChainStorage(Object.fromEntries(batch));
  }
  console.error(`pruned ${es.length} keys from ${contract}`);
};

export default pruneStorage;
