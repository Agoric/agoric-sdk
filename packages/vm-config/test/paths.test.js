import test from 'ava';
import fs from 'fs';
import path from 'path';
import { vatsSourceSpecRegistry } from '@agoric/vats/source-spec-registry.js';
import { interProtocolBundleSpecs } from '@agoric/inter-protocol/source-spec-registry.js';

const vmConfigDir = new URL('..', import.meta.url).pathname;

const collectPackagePaths = registry =>
  new Set(
    Object.values(registry)
      .map(entry => entry && entry.packagePath)
      .filter(Boolean),
  );

const allowedSourceSpecs = new Set([
  ...collectPackagePaths(vatsSourceSpecRegistry),
  ...collectPackagePaths(interProtocolBundleSpecs),
  '@agoric/smart-wallet/src/walletFactory.js',
  '@agoric/zoe/contractFacet.js',
]);

const allowedBuilderModules = new Set([
  '@agoric/builders/scripts/vats/init-core.js',
  '@agoric/builders/scripts/vats/init-network.js',
  '@agoric/builders/scripts/vats/init-localchain.js',
  '@agoric/builders/scripts/vats/init-transfer.js',
  '@agoric/builders/scripts/vats/init-orchestration.js',
  '@agoric/builders/scripts/orchestration/write-chain-info.js',
  '@agoric/builders/scripts/inter-protocol/init-core.js',
  '@agoric/builders/scripts/inter-protocol/add-collateral-core.js',
  '@agoric/builders/scripts/inter-protocol/price-feed-core.js',
  '@agoric/builders/scripts/inter-protocol/invite-committee-core.js',
]);

/**
 * @param {unknown} node
 * @param {(value: string, path: string) => void} onSourceSpec
 * @param {(value: string, path: string) => void} onModule
 * @param {string} currentPath
 */
const walk = (node, onSourceSpec, onModule, currentPath = '$') => {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) =>
      walk(child, onSourceSpec, onModule, `${currentPath}[${i}]`),
    );
    return;
  }
  const record = /** @type {Record<string, unknown>} */ (node);
  for (const [key, value] of Object.entries(record)) {
    const nextPath = `${currentPath}.${key}`;
    if (key === 'sourceSpec' && typeof value === 'string') {
      onSourceSpec(value, nextPath);
    }
    if (key === 'module' && typeof value === 'string') {
      onModule(value, nextPath);
    }
    walk(value, onSourceSpec, onModule, nextPath);
  }
};

test('source specs are registry-validated', t => {
  const files = fs
    .readdirSync(vmConfigDir)
    .filter(
      name =>
        name.endsWith('.json') &&
        (name.startsWith('decentral-') || name === 'demo-proposals.json'),
    )
    .map(name => path.join(vmConfigDir, name));

  /** @type {string[]} */
  const errors = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw);

    walk(
      json,
      (value, keyPath) => {
        if (!value.startsWith('@agoric/')) {
          return;
        }
        if (!allowedSourceSpecs.has(value)) {
          errors.push(
            `${path.basename(file)} ${keyPath}: disallowed sourceSpec ${value}`,
          );
        }
      },
      (value, keyPath) => {
        if (!value.startsWith('@agoric/')) {
          return;
        }
        if (!allowedBuilderModules.has(value)) {
          errors.push(
            `${path.basename(file)} ${keyPath}: disallowed module ${value}`,
          );
        }
      },
    );
  }

  t.log(
    `Validated ${files.length} vm-config JSON files against registry-backed allowlists.`,
  );
  t.deepEqual(errors, []);
});
