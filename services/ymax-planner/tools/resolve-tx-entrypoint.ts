/* eslint-env node */

// We need some pre-lockdown shimming.
import '@endo/init/pre-remoting.js';
import '../src/shims.cjs';
// import '@endo/lockdown/commit-debug.js';
import '../src/lockdown.js';

// ...but `resolveTx` must be loaded *after* lockdown
import { resolveTx } from './resolve-tx.ts';

(async () => {
  const dotEnvFile = process.env.DOTENV || '.env';

  // Capture our current env so that we can use them to override dotenv.
  const processEnv = { ...process.env };

  const dotenv = await import('dotenv');

  /**
   * Object that dotenv.config() will mutate to add variables from the
   * dotEnvFile.
   */
  const dotEnvAdditions = {} as { [key: string]: string };
  dotenv.config({ path: dotEnvFile, processEnv: dotEnvAdditions });

  const env = harden({ ...dotEnvAdditions, ...processEnv });

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: yarn resolve-tx <txId> <status>');
    console.error('  status: "success" or "fail"');
    console.error('');
    console.error('Examples:');
    console.error('  yarn resolve-tx tx399 success');
    console.error('  yarn resolve-tx tx400 fail');
    process.exit(1);
  }

  const txId = args[0] as `tx${number}`;
  const statusArg = args[1];

  return resolveTx(txId, statusArg, { env });
})().catch(err => {
  console.error(err);
  process.exit(1);
});
