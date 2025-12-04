/* eslint-env node */

// We need some pre-lockdown shimming.
import '@endo/init/pre-remoting.js';
import '../src/shims.cjs';
// import '@endo/lockdown/commit-debug.js';
import '../src/lockdown.js';

// ...but `processTx` must be loaded *after* lockdown
import { processTx } from './process-tx.ts';

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
  if (args.length === 0) {
    console.error('Usage: yarn process-tx <txId> [--verbose]');
    console.error('Example: yarn process-tx tx233');
    process.exit(1);
  }

  const txId = args[0];
  const options = args.slice(1);

  return processTx(txId, options, { env });
})().catch(err => {
  console.error(err);
  process.exit(1);
});
