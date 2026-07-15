#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file Generate src/fetched-chain-info.js from the cosmos chain-registry.
 *
 * `yarn codegen` fetches from a PINNED chain-registry commit (the
 * CHAIN_REGISTRY_COMMIT constant below), so its output is deterministic even
 * though it hits the network. That is what the codegen idempotence CI check
 * (scripts/verify-codegen-idempotence.mjs) verifies: re-running must not change
 * the committed src/fetched-chain-info.js. Because the commit is pinned,
 * upstream changes to chain-registry `master` never break CI on their own — you
 * adopt them deliberately by refreshing.
 *
 * To pull new chains or updated IBC data, refresh (this re-pins to the latest
 * chain-registry commit) and commit BOTH updated files:
 *
 *     yarn codegen --refresh
 *     # equivalently: ./scripts/fetch-chain-info.ts --refresh
 *
 * See the "Refreshing chain info" section of the package README for details.
 */
import { ChainRegistryClient } from '@chain-registry/client';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import prettier from 'prettier';
import { convertChainInfo } from '../src/utils/registry.js';

// The chain-registry commit codegen reads from, pinned so codegen is
// deterministic. `--refresh` rewrites this exact line, so keep the format
// (`const CHAIN_REGISTRY_COMMIT = '<40 hex>';`) stable.
const CHAIN_REGISTRY_COMMIT = '4f9299ef69855a858a6302a8ed2310de1ffd9547';

// XXX script assumes it's run from the package path
// XXX .json would be more apt; UNTIL https://github.com/endojs/endo/issues/2110
const outputFile = 'src/fetched-chain-info.js';
const registrySource = 'https://github.com/cosmos/chain-registry.git';
const registryRawBase =
  'https://raw.githubusercontent.com/cosmos/chain-registry';

/**
 * Names for which to fetch info
 */
export const chainNames = [
  'agoric',
  'archway',
  'axelar',
  'beezee',
  'carbon',
  'celestia',
  'coreum',
  'cosmoshub',
  'crescent',
  'doravota',
  'dydx',
  'dymension',
  'empowerchain',
  'evmos',
  'haqq',
  'injective',
  'juno',
  'kava',
  'kujira',
  'lava',
  'migaloo',
  'neutron',
  'nibiru',
  'noble',
  'nolus',
  'omniflixhub',
  'osmosis',
  'persistence',
  'planq',
  'provenance',
  'pryzm',
  'quicksilver',
  'secretnetwork',
  'sei',
  'shido',
  'sifchain',
  'stargaze',
  'stride',
  'terra2',
  'titan',
  'umee',
];

/** Resolve the latest chain-registry commit on the default branch. */
const resolveLatestCommit = () => {
  const stdout = execFileSync('git', ['ls-remote', registrySource, 'HEAD'], {
    encoding: 'utf8',
  });
  const [sha] = stdout.split(/\s/, 1);
  assert(
    /^[0-9a-f]{40}$/.test(sha),
    `unexpected git ls-remote output: ${stdout}`,
  );
  return sha;
};

/** Rewrite the CHAIN_REGISTRY_COMMIT constant in this source file. */
const repin = async (commit: string): Promise<void> => {
  const selfPath = fileURLToPath(import.meta.url);
  const before = await fsp.readFile(selfPath, 'utf8');
  const pattern = /(const CHAIN_REGISTRY_COMMIT = ')[0-9a-f]{40}(';)/;
  assert(pattern.test(before), 'could not find CHAIN_REGISTRY_COMMIT to repin');
  await fsp.writeFile(selfPath, before.replace(pattern, `$1${commit}$2`));
};

const {
  values: { refresh },
} = parseArgs({
  options: {
    // Re-pin to the latest chain-registry commit before generating.
    refresh: { type: 'boolean', default: false },
  },
});

let commit: string;
if (refresh) {
  commit = resolveLatestCommit();
  await repin(commit);
  console.log(
    `Re-pinned chain-registry to ${commit} in ${fileURLToPath(import.meta.url)}`,
  );
} else {
  commit = CHAIN_REGISTRY_COMMIT;
  console.log(
    `Using pinned chain-registry commit ${commit} (pass --refresh to update it)`,
  );
}

const client = new ChainRegistryClient({
  chainNames,
  // Pin to an immutable commit so codegen output is reproducible.
  baseUrl: `${registryRawBase}/${commit}`,
});

// Keep enough requests in flight for codegen to finish promptly without
// overwhelming raw.githubusercontent.com. In particular, retries must not
// recreate the original all-at-once request burst.
const FETCH_CONCURRENCY = 8;

/**
 * Fetch one registry URL, ignoring expected missing IBC pairs and retrying
 * other failures with exponential backoff.
 *
 * codegen pins chain-registry to an immutable commit (CHAIN_REGISTRY_COMMIT),
 * so the fetched content is identical across attempts — retrying is safe and
 * keeps codegen deterministic. This exists because `client.fetchUrls()` issues
 * all requests at once and ignores fetch errors. A transient failure can
 * therefore leave the client incomplete and make the CI idempotence check
 * generate different output, while expected 404s for absent IBC pairs should
 * remain optional.
 */
const fetchUrlWithRetry = async (
  url: string,
  retries = 5,
  delayMs = 500,
): Promise<void> => {
  try {
    const response = await fetch(url);
    if (response.status === 404) return;
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    client.update(await response.json());
  } catch (err) {
    if (retries <= 0) {
      throw new Error(`Failed to fetch ${url}`, { cause: err });
    }
    const message = err instanceof Error ? err.message : String(err);
    // Stagger concurrent retries so a transient failure does not make every
    // worker retry at the same instant. Timing does not affect generated data.
    const jitterMs = Math.floor(Math.random() * delayMs * 0.5);
    const waitMs = delayMs + jitterMs;
    console.warn(
      `fetch failed for ${url} (${retries} ${retries === 1 ? 'retry' : 'retries'} left), retrying in ${waitMs}ms: ${message}`,
    );
    await new Promise(resolve => setTimeout(resolve, waitMs));
    await fetchUrlWithRetry(url, retries - 1, delayMs * 2);
  }
};

// chain info, assets and ibc data are downloaded dynamically. Fetch each URL
// with bounded concurrency and retry (rather than client.fetchUrls()) so a
// transient network failure doesn't produce partial generated data or trigger
// a retry storm; see fetchUrlWithRetry above.
let nextUrlIndex = 0;
const workers = Array.from(
  { length: Math.min(FETCH_CONCURRENCY, client.urls.length) },
  async () => {
    for (;;) {
      const urlIndex = nextUrlIndex;
      nextUrlIndex += 1;
      if (urlIndex >= client.urls.length) return;
      await fetchUrlWithRetry(client.urls[urlIndex]);
    }
  },
);
await Promise.all(workers);

const chainInfo = await convertChainInfo(client);

const record = JSON.stringify(chainInfo, null, 2);
const src = `/** @file Generated by fetch-chain-info.ts */\nexport default /** @type {const} } */ (${record});`;
const prettySrc = await prettier.format(src, {
  parser: 'babel', // 'typescript' fails to preserve parens for typecast
  singleQuote: true,
  trailingComma: 'all',
});
await fsp.writeFile(outputFile, prettySrc);
console.log(`Wrote ${outputFile}`);
