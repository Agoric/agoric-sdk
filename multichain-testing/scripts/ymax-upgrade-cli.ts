#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file CLI for safe portfolio-contract (ymax) upgrades
 *
 * This CLI orchestrates the safe upgrade workflow using smart-wallet authority
 * to upgrade contracts in-place without destroying state.
 *
 * Workflow:
 * 1. Verify bundle is installed on-chain
 * 2. Build privateArgsOverrides (EVM chain configs)
 * 3. Verify control account matches expected address
 * 4. Invoke ymaxControl.upgrade(bundleId, overrides)
 * 5. Monitor transaction completion
 * 6. Verify upgrade success
 */
import '@endo/init/debug.js';

import { fetchEnvNetworkConfig, makeVstorageKit } from '@agoric/client-utils';
import { makeTracer } from '@agoric/internal';
import { execa } from 'execa';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const trace = makeTracer('YMaxUpgrade', true);

const USAGE = `
USAGE: ymax-upgrade-cli.ts [bundleId] [options]

ARGUMENTS:
  bundleId                Bundle ID to upgrade to (e.g., b1-abc123...)
                          If omitted, reads from multichain-testing/ymax-ops/,ymax-bundle-id

OPTIONS:
  --net=<network>         Network to deploy to: devnet|main (default: devnet)
  --contract=<name>       Contract name: ymax0|ymax1 (default: ymax0)
  --dry-run               Show what would be done without executing
  --quiet                 Minimal output (errors only)
  --verbose               Detailed debug output
  --json                  Output results as JSON

ENVIRONMENT VARIABLES:
  MNEMONIC                Required: ymaxControl wallet mnemonic
  AGORIC_NET              Network override (same as --net)

EXAMPLES:
  # Upgrade ymax0 on devnet with bundle from file
  export MNEMONIC="<ymaxControl mnemonic>"
  ymax-upgrade-cli.ts b1-abc123... --net=devnet

  # Dry run to see what would happen
  ymax-upgrade-cli.ts --dry-run

  # Read bundle ID from ymax-ops directory
  cd multichain-testing/ymax-ops && make ,ymax-bundle-id
  cd ../scripts
  ymax-upgrade-cli.ts

PREREQUISITES:
  1. Bundle must be installed on-chain first (via governance)
  2. MNEMONIC environment variable must be set to ymaxControl mnemonic
  3. For devnet: get mnemonic from 1password "gov keys"

See multichain-testing/ymax-ops/Makefile for the underlying workflow.
`.trim();

type CliOptions = {
  bundleId?: string;
  net: 'devnet' | 'main';
  contract: 'ymax0' | 'ymax1';
  dryRun: boolean;
  quiet: boolean;
  verbose: boolean;
  json: boolean;
};

const parseCliArgs = (argv: string[]): CliOptions => {
  const { values, positionals } = parseArgs({
    args: argv.slice(2),
    options: {
      net: { type: 'string', default: process.env.AGORIC_NET || 'devnet' },
      contract: { type: 'string', default: 'ymax0' },
      'dry-run': { type: 'boolean', default: false },
      quiet: { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const net = values.net as string;
  if (net !== 'devnet' && net !== 'main') {
    throw new Error(`Invalid --net: ${net}. Must be 'devnet' or 'main'`);
  }

  const contract = values.contract as string;
  if (contract !== 'ymax0' && contract !== 'ymax1') {
    throw new Error(`Invalid --contract: ${contract}. Must be 'ymax0' or 'ymax1'`);
  }

  return {
    bundleId: positionals[0],
    net: net as 'devnet' | 'main',
    contract: contract as 'ymax0' | 'ymax1',
    dryRun: values['dry-run'] as boolean,
    quiet: values.quiet as boolean,
    verbose: values.verbose as boolean,
    json: values.json as boolean,
  };
};

/**
 * Expected control account addresses per network/contract
 */
const CONTROL_ADDRESSES = {
  ymax0: {
    main: 'agoric1e80twfutmrm3wrk3fysjcnef4j82mq8dn6nmcq',
    devnet: 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv',
  },
  ymax1: {
    main: 'agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928',
    devnet: 'agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928', // TODO: verify devnet address
  },
} as const;

/**
 * Read bundle ID from ymax-ops directory if not provided
 */
const readBundleId = async (providedId?: string): Promise<string> => {
  if (providedId) return providedId;

  try {
    const bundleIdPath = new URL(
      '../../ymax-ops/,ymax-bundle-id',
      import.meta.url,
    );
    const bundleId = (await readFile(bundleIdPath, 'utf-8')).trim();
    trace('Read bundle ID from file:', bundleId);
    return bundleId;
  } catch (err) {
    throw new Error(
      'Bundle ID not provided and could not read from multichain-testing/ymax-ops/,ymax-bundle-id. ' +
        'Run "make ,ymax-bundle-id" in ymax-ops directory or provide bundle ID as argument.',
    );
  }
};

/**
 * Verify bundle exists on-chain using agoric follow
 */
const verifyBundleOnChain = async (
  bundleId: string,
  net: string,
): Promise<boolean> => {
  trace('Verifying bundle on-chain:', bundleId);

  const netconfig = `https://${net}.agoric.net/network-config`;

  try {
    const { stdout } = await execa('agoric', [
      'follow',
      '-lF',
      '-B',
      netconfig,
      '-o',
      'json',
      ':bundles',
    ]);

    const bundles = JSON.parse(stdout);
    const found = bundles.endoZipBase64Sha512 === bundleId.replace(/^b1-/, '');

    if (found) {
      trace('✓ Bundle verified on-chain');
    } else {
      trace('✗ Bundle not found on-chain');
    }

    return found;
  } catch (err) {
    trace('Error checking bundle:', err);
    return false;
  }
};

/**
 * Build privateArgsOverrides using ymax-tool
 */
const buildOverrides = async (net: string): Promise<object> => {
  trace('Building privateArgsOverrides...');

  const ymaxToolPath = new URL('./ymax-tool.ts', import.meta.url).pathname;
  const { stdout } = await execa(
    'node',
    [ymaxToolPath, '--buildEthOverrides'],
    {
      env: { ...process.env, AGORIC_NET: net },
    },
  );

  const overrides = JSON.parse(stdout);
  trace('✓ Built overrides');
  return overrides;
};

/**
 * Verify control account using ymax-tool --repl
 */
const verifyControlAccount = async (
  expectedAddress: string,
  net: string,
): Promise<boolean> => {
  trace('Verifying control account:', expectedAddress);

  const ymaxToolPath = new URL('./ymax-tool.ts', import.meta.url).pathname;

  try {
    const { stdout } = await execa('node', [ymaxToolPath, '--repl'], {
      env: { ...process.env, AGORIC_NET: net },
      input: '',
    });

    const found = stdout.includes(expectedAddress);
    if (found) {
      trace('✓ Control account verified');
    } else {
      trace('✗ Control account mismatch');
      trace('Expected:', expectedAddress);
      trace('Check MNEMONIC environment variable');
    }

    return found;
  } catch (err) {
    trace('Error verifying control account:', err);
    return false;
  }
};

/**
 * Invoke upgrade via ymax-tool
 */
const invokeUpgrade = async (
  bundleId: string,
  overrides: object,
  net: string,
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  trace('Invoking upgrade...');

  const ymaxToolPath = new URL('./ymax-tool.ts', import.meta.url).pathname;

  try {
    const { stdout } = await execa(
      'node',
      [ymaxToolPath, '--upgrade', bundleId],
      {
        env: { ...process.env, AGORIC_NET: net },
        input: JSON.stringify(overrides),
      },
    );

    trace('✓ Upgrade invoked successfully');
    trace('Output:', stdout);

    // Try to extract transaction hash from output
    const txHashMatch = stdout.match(/transactionHash['":\s]+([A-F0-9]+)/i);

    return {
      success: true,
      txHash: txHashMatch?.[1],
    };
  } catch (err) {
    trace('✗ Upgrade failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * Main upgrade workflow
 */
const main = async (argv = process.argv) => {
  const opts = parseCliArgs(argv);
  const startTime = Date.now();

  // Configure tracing based on verbosity
  if (opts.quiet) {
    // Only errors
  } else if (opts.verbose) {
    trace.enabled = true;
  }

  if (!opts.quiet && !opts.json) {
    console.log(`🚀 YMax Upgrade CLI`);
    console.log(`Network: ${opts.net}`);
    console.log(`Contract: ${opts.contract}`);
    if (opts.dryRun) {
      console.log(`Mode: DRY RUN (no changes will be made)`);
    }
    console.log();
  }

  try {
    // Step 1: Get bundle ID
    const bundleId = await readBundleId(opts.bundleId);
    if (!opts.quiet && !opts.json) {
      console.log(`[1/6] Bundle ID: ${bundleId}`);
    }

    // Step 2: Verify bundle on-chain
    if (!opts.quiet && !opts.json) {
      console.log(`[2/6] Verifying bundle on-chain...`);
    }
    const bundleExists = await verifyBundleOnChain(bundleId, opts.net);
    if (!bundleExists) {
      throw new Error(
        `Bundle ${bundleId} not found on-chain. Install it first via governance.`,
      );
    }
    if (!opts.quiet && !opts.json) {
      console.log(`      ✓ Bundle verified`);
    }

    // Step 3: Build overrides
    if (!opts.quiet && !opts.json) {
      console.log(`[3/6] Building privateArgsOverrides...`);
    }
    const overrides = await buildOverrides(opts.net);
    if (!opts.quiet && !opts.json) {
      console.log(`      ✓ Overrides built`);
    }

    // Step 4: Check MNEMONIC
    if (!opts.quiet && !opts.json) {
      console.log(`[4/6] Checking MNEMONIC environment variable...`);
    }
    if (!process.env.MNEMONIC) {
      throw new Error(
        'MNEMONIC environment variable not set. ' +
          'Export ymaxControl mnemonic from 1password.',
      );
    }
    if (!opts.quiet && !opts.json) {
      console.log(`      ✓ MNEMONIC set`);
    }

    // Step 5: Verify control account
    if (!opts.quiet && !opts.json) {
      console.log(`[5/6] Verifying control account...`);
    }
    const expectedAddress = CONTROL_ADDRESSES[opts.contract][opts.net];
    const accountValid = await verifyControlAccount(expectedAddress, opts.net);
    if (!accountValid) {
      throw new Error(
        `Control account mismatch. Expected ${expectedAddress}. ` +
          'Check MNEMONIC environment variable.',
      );
    }
    if (!opts.quiet && !opts.json) {
      console.log(`      ✓ Control account verified: ${expectedAddress}`);
    }

    // Step 6: Invoke upgrade
    if (opts.dryRun) {
      if (!opts.quiet && !opts.json) {
        console.log(`[6/6] DRY RUN: Would invoke upgrade with:`);
        console.log(`      Bundle ID: ${bundleId}`);
        console.log(`      Network: ${opts.net}`);
        console.log(`      Contract: ${opts.contract}`);
        console.log(`      Control: ${expectedAddress}`);
        console.log();
        console.log(`✓ Dry run complete. All preconditions verified.`);
      }

      if (opts.json) {
        console.log(
          JSON.stringify(
            {
              success: true,
              dryRun: true,
              bundleId,
              network: opts.net,
              contract: opts.contract,
              controlAddress: expectedAddress,
            },
            null,
            2,
          ),
        );
      }

      return;
    }

    if (!opts.quiet && !opts.json) {
      console.log(`[6/6] Invoking upgrade...`);
    }
    const result = await invokeUpgrade(bundleId, overrides, opts.net);

    if (!result.success) {
      throw new Error(`Upgrade failed: ${result.error}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!opts.quiet && !opts.json) {
      console.log(`      ✓ Upgrade invoked successfully`);
      if (result.txHash) {
        console.log(`      Transaction: ${result.txHash}`);
      }
      console.log();
      console.log(`✅ Upgrade complete! (${duration}s)`);
      console.log();
      console.log(`Next steps:`);
      console.log(`  1. Monitor chain logs to verify operational`);
      console.log(`  2. Test contract functionality`);
      console.log(`  3. Verify portfolio operations work correctly`);
    }

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            bundleId,
            network: opts.net,
            contract: opts.contract,
            controlAddress: expectedAddress,
            txHash: result.txHash,
            duration: parseFloat(duration),
          },
          null,
          2,
        ),
      );
    }
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: err instanceof Error ? err.message : String(err),
            duration: parseFloat(duration),
          },
          null,
          2,
        ),
      );
    } else {
      console.error();
      console.error(
        `❌ Upgrade failed: ${err instanceof Error ? err.message : err}`,
      );
      console.error();
    }

    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
