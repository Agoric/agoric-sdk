import test from 'ava';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileP = promisify(execFile);

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const shimHref = pathToFileURL(
  fileURLToPath(
    new URL('../src/shims/promise-with-resolvers.js', import.meta.url),
  ),
).href;

const runNode = source =>
  execFileP(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: repoRoot,
    env: { ...process.env, FORCE_COLOR: '0' },
  });

test('promise-with-resolvers shim installs a working fallback when missing', async t => {
  const { stdout, stderr } = await runNode(`
    delete Promise.withResolvers;
    await import(${JSON.stringify(shimHref)});

    const { promise, resolve, reject } = Promise.withResolvers();
    resolve('resolved');

    console.log(JSON.stringify({
      result: await promise,
      hasResolve: typeof resolve,
      hasReject: typeof reject,
    }));
  `);

  t.is(stderr, '');
  t.deepEqual(JSON.parse(stdout), {
    result: 'resolved',
    hasResolve: 'function',
    hasReject: 'function',
  });
});

test('promise-with-resolvers shim preserves an existing implementation', async t => {
  const { stdout, stderr } = await runNode(`
    const sentinel = () => ({
      promise: 'sentinel promise',
      resolve: 'sentinel resolve',
      reject: 'sentinel reject',
    });
    Object.defineProperty(Promise, 'withResolvers', {
      value: sentinel,
      writable: true,
      configurable: true,
    });

    await import(${JSON.stringify(shimHref)});

    console.log(JSON.stringify({
      preserved: Promise.withResolvers === sentinel,
      kit: Promise.withResolvers(),
    }));
  `);

  t.is(stderr, '');
  t.deepEqual(JSON.parse(stdout), {
    preserved: true,
    kit: {
      promise: 'sentinel promise',
      resolve: 'sentinel resolve',
      reject: 'sentinel reject',
    },
  });
});
