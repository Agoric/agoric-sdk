import test from 'ava';

import fs from 'node:fs';
import { makeSwingsetConfigIO } from '../src/controller/swingset-config.js';

/**
 * @param {Record<string, string>} files
 * @param {(specifier: string, referrer: string) => Promise<string> | string} [importMetaResolve]
 */
const makePowers = (
  files,
  importMetaResolve = async () => {
    const err = Error('module not found');
    // @ts-expect-error ad hoc error code for tests
    err.code = 'ERR_MODULE_NOT_FOUND';
    throw err;
  },
) => ({
  readdirSync: (dir, _opts) =>
    Object.keys(files)
      .filter(p => p.startsWith(`${dir}/`))
      .map(p => p.slice(`${dir}/`.length))
      .filter(name => !name.includes('/'))
      .map(name => ({ name, isFile: () => true })),
  statSync: path => {
    if (!(path in files)) {
      const err = Error('not found');
      // @ts-expect-error ad hoc error code for tests
      err.code = 'ENOENT';
      throw err;
    }
    return { isFile: () => true };
  },
  existsSync: path => path in files,
  readFileSync: (path, _encoding) => {
    if (!(path in files)) {
      const err = Error('not found');
      // @ts-expect-error ad hoc error code for tests
      err.code = 'ENOENT';
      throw err;
    }
    return files[path];
  },
  pathResolve: (...paths) =>
    paths
      .join('/')
      .replace(/\/{2,}/g, '/')
      .replace(/\/\.\//g, '/'),
  cwd: () => '/cwd',
  importMetaResolve,
  consoleError: () => {},
});

test('loadBasedir discovers vats and bootstrap', t => {
  const files = {
    '/repo/vat-z.js': '',
    '/repo/vat-a.js': '',
    '/repo/bootstrap.js': '',
    '/repo/not-vat.txt': '',
  };
  const { loadBasedir } = makeSwingsetConfigIO(makePowers(files));
  const cfg = loadBasedir('/repo');
  t.deepEqual(Object.keys(cfg.vats), ['a', 'z', 'bootstrap']);
  t.is(cfg.bootstrap, 'bootstrap');
  if ('sourceSpec' in cfg.vats.a) {
    t.is(cfg.vats.a.sourceSpec, '/repo/vat-a.js');
  } else {
    t.fail('expected vat "a" to be configured with sourceSpec');
  }
});

test('normalizeConfig resolves module and relative source paths', async t => {
  const files = {
    '/resolved/mod-vat.js': '',
    '/cwd/local-vat.js': '',
  };
  const { normalizeConfig } = makeSwingsetConfigIO(
    makePowers(files, async specifier => {
      if (specifier === '@pkg/mod-vat.js') {
        return 'file:///resolved/mod-vat.js';
      }
      const err = Error('module not found');
      // @ts-expect-error ad hoc error code for tests
      err.code = 'ERR_MODULE_NOT_FOUND';
      throw err;
    }),
  );

  const config = {
    bootstrap: 'mod',
    vats: {
      mod: { sourceSpec: '@pkg/mod-vat.js' },
      local: { sourceSpec: './local-vat.js' },
    },
  };

  await normalizeConfig(config, '/cwd/config.json');
  t.is(config.vats.mod.sourceSpec, '/resolved/mod-vat.js');
  t.is(config.vats.local.sourceSpec, '/cwd/local-vat.js');
  t.deepEqual(config.vats.mod.parameters, {});
});

test('loadSwingsetConfigFile returns null on ENOENT', async t => {
  const { loadSwingsetConfigFile } = makeSwingsetConfigIO(
    makePowers({}, async () => 'file:///unused'),
  );
  const cfg = await loadSwingsetConfigFile('/missing/config.json');
  t.is(cfg, null);
});

test('normalizeConfig throws when resolved file does not exist', async t => {
  const { normalizeConfig } = makeSwingsetConfigIO(
    makePowers({}, async () => 'file:///resolved/missing.js'),
  );
  const config = {
    bootstrap: 'mod',
    vats: { mod: { sourceSpec: '@pkg/missing.js' } },
  };
  await t.throwsAsync(() => normalizeConfig(config, '/cwd/config.json'), {
    message: /does not exist/,
  });
});

test('initializeSwingset module has no direct fs/path imports', t => {
  const source = fs.readFileSync(
    new URL('../src/controller/initializeSwingset.js', import.meta.url),
    'utf-8',
  );
  t.notRegex(source, /from ['"]fs['"]/);
  t.notRegex(source, /from ['"]path['"]/);
});
