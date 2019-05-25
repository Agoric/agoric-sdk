import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';

async function testFlush(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, withSES, ['flush']);
  // all promises should settle before c.step() fires
  await c.step();
  t.deepEqual(c.dump().log, ['bootstrap called', 'then1', 'then2']);
  t.end();
}

test('flush with SES', async t => {
  await testFlush(t, true);
});

test('flush without SES', async t => {
  await testFlush(t, false);
});

async function testEThen(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, withSES, ['e-then']);

  await c.run();
  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'left.callRight 1',
    'right 2',
    'b.resolved 3',
    'left.then 4',
  ]);
  t.end();
}

test('E() resolve with SES', async t => {
  await testEThen(t, true);
});

test('E() resolve without SES', async t => {
  await testEThen(t, false);
});

async function testChain1(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, withSES, ['chain1']);

  /*
  while (true) {
    console.log('--- STEP ----------------------------------------------------------------');
    await c.step();
    console.log(c.dump());
    if (!c.dump().runQueue.length)
      break;
  } */
  await c.run();

  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'b.call2',
    'left.call2 1',
    'left.call3 2',
    'b.resolved 3',
  ]);
  t.end();
}

test('E(E(x).foo()).bar() with SES', async t => {
  await testChain1(t, true);
});

test('E(E(x).foo()).bar() without SES', async t => {
  await testChain1(t, false);
});

async function testChain2(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, withSES, ['chain2']);

  await c.run();
  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'b.call2',
    'left.call2 1',
    'left.call3 2',
    'b.resolved 3',
  ]);
  t.end();
}

test('E(Promise.resolve(presence)).foo() with SES', async t => {
  await testChain2(t, true);
});

test('E(Promise.resolve(presence)).foo() without SES', async t => {
  await testChain2(t, false);
});

async function testLocal1(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, withSES, ['local1']);

  await c.run();
  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'b.local1.finish',
    'local.foo 1',
    'b.resolved 2',
  ]);
  t.end();
}

test('E(local).foo() with SES', async t => {
  await testLocal1(t, true);
});

test('E(local).foo() without SES', async t => {
  await testLocal1(t, false);
});

async function testLocal2(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, withSES, ['local2']);

  await c.run();
  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'b.local2.finish',
    'left.returnArg',
    'local.foo 2',
    'b.resolved 3',
  ]);
  t.end();
}

test('resolve-to-local with SES', async t => {
  await testLocal2(t, true);
});

test.only('resolve-to-local without SES', async t => {
  await testLocal2(t, false);
});

async function testSendPromise1(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, withSES, ['send-promise1']);

  await c.run();
  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'b.send-promise1.finish',
    'left.takePromise',
    'left.takePromise.then',
    'local.foo 1',
    'b.resolved 4',
  ]);
  t.end();
}

test('send-promise-resolve-to-local with SES', async t => {
  await testSendPromise1(t, true);
});

test('send-promise-resolve-to-local without SES', async t => {
  await testSendPromise1(t, false);
});
