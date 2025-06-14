import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Read the actual fixture files as strings
 */
export const cmdRunnerExample = await readFile(
  require.resolve('./cmd-runner-example.js'),
  'utf8',
).then(s => s.trim());

export const readonlyFileExample = await readFile(
  require.resolve('./readonly-file-example.js'),
  'utf8',
).then(s => s.trim());
