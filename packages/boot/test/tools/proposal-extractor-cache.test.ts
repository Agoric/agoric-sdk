/* eslint-env node */

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createHash } from 'node:crypto';
import * as fsPromises from 'node:fs/promises';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import { join } from 'node:path';

import { makeProposalExtractor } from '../../tools/supports.js';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const importSpec = createRequire(import.meta.url).resolve;

const makeFixture = async t => {
  const root = await mkdtemp(join(os.tmpdir(), 'boot-proposal-cache-'));
  t.teardown(async () => rm(root, { recursive: true, force: true }));

  const builderPath = join(root, 'builder.js');
  const dependencyPath = join(root, 'dependency.txt');
  await writeFile(builderPath, 'export default null;\n', 'utf8');
  await writeFile(dependencyPath, 'v1\n', 'utf8');

  const cacheRoot = join(root, '.cache');
  await mkdir(cacheRoot, { recursive: true });

  return { root, builderPath, dependencyPath, cacheRoot };
};

test('proposal extractor caches materials on disk and reuses across instances', async t => {
  const { builderPath, dependencyPath, cacheRoot } = await makeFixture(t);
  const cacheEvents: Array<{ type: string; reason?: string }> = [];

  let builds = 0;
  const fakeBuilder: any = async ({ mode }) => {
    builds += 1;
    return harden({
      bundles: [{ moduleFormat: 'endoZipBase64', endoZipBase64: 'AAAA' }],
      dependencies: [dependencyPath],
      evals: [
        {
          json_permits: '{"consume":{}}',
          js_code: 'harden({});',
        },
      ],
      modeUsed: mode === 'shell-only' ? 'shell' : 'in-process',
      resolvedBuilderPath: builderPath,
    });
  };

  const extractorA = makeProposalExtractor(
    {
      buildCoreEvalProposal: fakeBuilder,
      childProcess: {
        execFileSync: () => {
          throw Error('shell path should not be used');
        },
      },
      fs: fsPromises,
    },
    import.meta.url,
    {
      cacheRoot,
      onCacheEvent: event => cacheEvents.push(event),
    },
  );

  const first = await extractorA(builderPath, ['--example']);
  const second = await extractorA(builderPath, ['--example']);
  t.is(builds, 1);
  t.deepEqual(second, first);

  const extractorB = makeProposalExtractor(
    {
      buildCoreEvalProposal: fakeBuilder,
      childProcess: {
        execFileSync: () => {
          throw Error('shell path should not be used');
        },
      },
      fs: fsPromises,
    },
    import.meta.url,
    { cacheRoot },
  );

  const third = await extractorB(builderPath, ['--example']);
  t.is(builds, 1);
  t.deepEqual(third, first);
  t.true(cacheEvents.some(event => event.type === 'proposal-cache-miss'));
  t.true(cacheEvents.some(event => event.type === 'proposal-cache-hit'));
});

test('proposal extractor invalidates cache when dependency content changes', async t => {
  const { builderPath, dependencyPath, cacheRoot } = await makeFixture(t);

  let builds = 0;
  const fakeBuilder: any = async () => {
    builds += 1;
    return harden({
      bundles: [{ moduleFormat: 'endoZipBase64', endoZipBase64: 'AAAA' }],
      dependencies: [dependencyPath],
      evals: [{ json_permits: '{}', js_code: `harden({ build: ${builds} });` }],
      modeUsed: 'in-process',
      resolvedBuilderPath: builderPath,
    });
  };

  const extractor = makeProposalExtractor(
    {
      buildCoreEvalProposal: fakeBuilder,
      childProcess: {
        execFileSync: () => {
          throw Error('shell path should not be used');
        },
      },
      fs: fsPromises,
    },
    import.meta.url,
    { cacheRoot },
  );

  await extractor(builderPath, []);
  await writeFile(dependencyPath, 'v2\n', 'utf8');
  await extractor(builderPath, []);

  t.is(builds, 2);
});

test('prefer-in-process falls back to shell-only mode when builder throws', async t => {
  const { builderPath, dependencyPath, cacheRoot } = await makeFixture(t);

  const modes: string[] = [];
  const fakeBuilder: any = async ({ mode }) => {
    modes.push(mode || 'missing');
    if (mode !== 'shell-only') {
      throw Error('simulate in-process failure');
    }
    return harden({
      bundles: [{ moduleFormat: 'endoZipBase64', endoZipBase64: 'AAAA' }],
      dependencies: [dependencyPath],
      evals: [{ json_permits: '{}', js_code: 'harden({ fallback: true });' }],
      modeUsed: 'shell',
      resolvedBuilderPath: builderPath,
    });
  };

  const extractor = makeProposalExtractor(
    {
      buildCoreEvalProposal: fakeBuilder,
      childProcess: {
        execFileSync: () => {
          throw Error('shell child process should not run in this unit test');
        },
      },
      fs: fsPromises,
    },
    import.meta.url,
    { cacheRoot, mode: 'prefer-in-process' },
  );

  const materials = await extractor(builderPath, []);
  t.true(materials.evals[0]?.js_code.includes('fallback'));
  t.deepEqual(modes, ['prefer-in-process', 'shell-only']);
});

test('stale/dead lock is recovered before building', async t => {
  const { builderPath, dependencyPath, cacheRoot } = await makeFixture(t);
  const cacheEvents: Array<{ type: string; reason?: string }> = [];

  const args = ['--recover-lock'];
  const mode = 'prefer-in-process';
  const schemaVersion = 'v1';
  const resolvedBuilderPath = importSpec(builderPath);
  const cacheKey = sha256(
    JSON.stringify({
      args,
      builderPath: resolvedBuilderPath,
      mode,
      schemaVersion,
    }),
  );
  const lockPath = join(
    cacheRoot,
    '.locks',
    `${encodeURIComponent(cacheKey)}.lock`,
  );
  await mkdir(lockPath, { recursive: true });
  await writeFile(
    join(lockPath, 'owner.json'),
    JSON.stringify({ pid: 999_999_999, createdAt: Date.now() }),
    'utf8',
  );

  let builds = 0;
  const fakeBuilder: any = async () => {
    builds += 1;
    return harden({
      bundles: [{ moduleFormat: 'endoZipBase64', endoZipBase64: 'AAAA' }],
      dependencies: [dependencyPath],
      evals: [
        { json_permits: '{}', js_code: 'harden({ lockRecovered: true });' },
      ],
      modeUsed: 'in-process',
      resolvedBuilderPath: builderPath,
    });
  };

  const extractor = makeProposalExtractor(
    {
      buildCoreEvalProposal: fakeBuilder,
      childProcess: {
        execFileSync: () => {
          throw Error('shell path should not be used');
        },
      },
      fs: fsPromises,
    },
    import.meta.url,
    {
      cacheRoot,
      onCacheEvent: event => cacheEvents.push(event),
    },
  );

  await extractor(builderPath, args);
  t.is(builds, 1);
  t.true(
    cacheEvents.some(
      event => event.type === 'lock-broken' && event.reason === 'dead-owner',
    ),
  );

  const lockStats = await stat(lockPath).catch(() => undefined);
  t.is(lockStats, undefined);
});
