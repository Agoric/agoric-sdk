import test from 'ava';
import mockfs from 'mock-fs';
import { existsSync, readFileSync } from 'node:fs';
import config from '../../src/cli/config.js';
import { mockOut, mockrl } from '../../testing/mocks.js';

test.afterEach(() => {
  mockfs.restore();
});

// Serialize tests to prevent filesystem conflicts
test.serial('show reads the config file', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const val = JSON.stringify({ hello: 'world!' }, null, 2);
  mockfs({
    [path]: val,
  });
  const out = mockOut();

  // @ts-expect-error mocking partial Console
  await config.show(path, out);

  t.is(out.getErrOut(), '');
  t.is(out.getLogOut(), `Config found at ${path}:\n${val}\n`);
});

test.serial('show shows error if no config file', async t => {
  const path = 'missing-config/dir/.fast-usdc/config.json';
  mockfs({});
  const out = mockOut();

  // @ts-expect-error mocking partial Console
  await config.show(path, out);

  t.is(
    out.getErrOut(),
    `No config found at ${path}. Use "init" to create one, or "--home" to specify config location.\n`,
  );
  t.is(out.getLogOut(), '');
});

test.serial('init creates the config file', async t => {
  const dir = 'config/dir/.fast-usdc';
  const path = `${dir}/config.json`;
  mockfs({
    'config/dir': {},
  });
  const out = mockOut();
  const options = { foo: 'bar' };

  // @ts-expect-error mock partial Console
  await config.init(dir, path, options, out);

  t.is(out.getLogOut(), `Config initialized at ${path}\n`);
  t.is(out.getErrOut(), '');
  t.is(readFileSync(path, 'utf-8'), JSON.stringify(options, null, 2));
});

test.serial('init overwrites if config exists and user says yes', async t => {
  const dir = 'config/dir/.fast-usdc';
  const path = `${dir}/config.json`;
  const oldVal = JSON.stringify({ hello: 'world!' }, null, 2);
  mockfs({
    [path]: oldVal,
  });
  const out = mockOut();
  // Answer yes to prompt
  const rl = mockrl('y');
  const newVal = { hello: 'universe!' };

  // @ts-expect-error mock partial Console
  await config.init(dir, path, newVal, out, rl);

  t.is(out.getErrOut(), '');
  t.is(out.getLogOut(), `Config initialized at ${path}\n`);
  t.is(readFileSync(path, 'utf-8'), JSON.stringify(newVal, null, 2));
});

test.serial(
  'init does not overwrite if config exists and user says no',
  async t => {
    const dir = 'config/dir/.fast-usdc';
    const path = `${dir}/config.json`;
    const oldVal = JSON.stringify({ hello: 'world!' }, null, 2);
    mockfs({
      [path]: oldVal,
    });
    const out = mockOut();
    // Answer no to prompt
    const rl = mockrl('n');
    const newVal = { hello: 'universe!' };

    // @ts-expect-error mock partial Console
    await config.init(dir, path, newVal, out, rl);

    t.is(out.getErrOut(), '');
    t.is(out.getLogOut(), '');
    t.is(readFileSync(path, 'utf-8'), oldVal);
  },
);

test.serial('update errors if config does not exist', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  // Path doesn't exist
  mockfs({});
  const out = mockOut();
  const newVal = { hello: 'universe!' };

  // @ts-expect-error mock partial Console
  await config.update(path, newVal, out);

  t.is(
    out.getErrOut(),
    `No config found at ${path}. Use "init" to create one, or "--home" to specify config location.\n`,
  );
  t.is(out.getLogOut(), '');
  t.false(existsSync(path));
});

test.serial('update can update the config partially', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const oldVal = JSON.stringify({ hello: 'world!' }, null, 2);
  mockfs({
    [path]: oldVal,
  });
  const out = mockOut();
  const newVal = { hello: 'universe!', goodbye: 'world!' };
  const newValString = JSON.stringify(newVal, null, 2);

  // @ts-expect-error mock partial Console
  await config.update(path, newVal, out);

  t.is(out.getErrOut(), '');
  t.is(out.getLogOut(), `Config updated at ${path}\n${newValString}\n`);
  t.is(readFileSync(path, 'utf-8'), newValString);
});
