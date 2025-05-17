import test from 'ava';
import * as config from '../../src/cli/config.js';
import { mockOut, mockrl, mockFile } from '../../testing/mocks.js';

test('show reads the config file', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const val = JSON.stringify({ hello: 'world!' }, null, 2);
  const file = mockFile(path, val);
  const out = mockOut();

  // @ts-expect-error mocking partial Console
  await config.show(file, out);

  t.is(out.getErrOut(), '');
  t.is(out.getLogOut(), `Config found at ${path}:\n${val}\n`);
});

test('show shows error if no config file', async t => {
  const path = 'missing-config/dir/.fast-usdc/config.json';
  const out = mockOut();
  const file = mockFile(path);

  // @ts-expect-error mocking partial Console
  await t.throwsAsync(config.show(file, out));

  t.is(
    out.getErrOut(),
    `No config found at ${path}. Use "init" to create one, or "--home" to specify config location.\n`,
  );
  t.is(out.getLogOut(), '');
});

test('init creates the config file', async t => {
  const dir = 'config/dir/.fast-usdc';
  const path = `${dir}/config.json`;
  const file = mockFile(path);
  const out = mockOut();
  const options = { foo: 'bar' };

  // @ts-expect-error mock partial Console
  await config.init(file, options, out, mockrl());

  t.is(out.getLogOut(), `Config initialized at ${path}\n`);
  t.is(out.getErrOut(), '');
  t.is(await file.read(), JSON.stringify(options, null, 2));
});

test('init overwrites if config exists and user says yes', async t => {
  const dir = 'config/dir/.fast-usdc';
  const path = `${dir}/config.json`;
  const oldVal = JSON.stringify({ hello: 'world!' }, null, 2);
  const file = mockFile(path, oldVal);
  const out = mockOut();
  // Answer yes to prompt
  const rl = mockrl('y');
  const newVal = { hello: 'universe!' };

  // @ts-expect-error mock partial Console
  await config.init(file, newVal, out, rl);

  t.is(out.getErrOut(), '');
  t.is(out.getLogOut(), `Config initialized at ${path}\n`);
  t.is(await file.read(), JSON.stringify(newVal, null, 2));
});

test('init does not overwrite if config exists and user says no', async t => {
  const dir = 'config/dir/.fast-usdc';
  const path = `${dir}/config.json`;
  const oldVal = JSON.stringify({ hello: 'world!' }, null, 2);
  const file = mockFile(path, oldVal);
  const out = mockOut();
  // Answer no to prompt
  const rl = mockrl('n');
  const newVal = { hello: 'universe!' };

  // @ts-expect-error mock partial Console
  await t.throwsAsync(config.init(file, newVal, out, rl));

  t.is(out.getErrOut(), '');
  t.is(out.getLogOut(), '');
  t.is(await file.read(), oldVal);
});

test('update errors if config does not exist', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  // Path doesn't exist
  const file = mockFile(path);
  const out = mockOut();
  const newVal = { hello: 'universe!' };

  // @ts-expect-error mock partial Console
  await t.throwsAsync(config.update(file, newVal, out));

  t.is(
    out.getErrOut(),
    `No config found at ${path}. Use "init" to create one, or "--home" to specify config location.\n`,
  );
  t.is(out.getLogOut(), '');
  t.false(file.exists());
});

test('update can update the config partially', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const oldVal = JSON.stringify({ hello: 'world!' }, null, 2);
  const file = mockFile(path, oldVal);
  const out = mockOut();
  const newVal = { hello: 'universe!', goodbye: 'world!' };
  const newValString = JSON.stringify(newVal, null, 2);

  // @ts-expect-error mock partial Console
  await config.update(file, newVal, out);

  t.is(out.getErrOut(), '');
  t.is(out.getLogOut(), `Config updated at ${path}\n${newValString}\n`);
  t.is(await file.read(), newValString);
});
