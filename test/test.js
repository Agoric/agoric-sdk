import test from 'tape';
import makeEPromiseClass from '../src/index';

test('get', async t => {
  const EPromise = makeEPromiseClass(Promise);
  const res = await EPromise.resolve([123, 456, 789]).get(1);
  t.equal(res, 456);
  t.end();
});

test('put', async t => {
  const EPromise = makeEPromiseClass(Promise);
  const a = [123, 456, 789];
  const ep = EPromise.resolve(a);
  t.equal(await ep.put(1, 999), 999);
  t.deepEqual(a, [123, 999, 789]);
  t.end();
});

test('post', async t => {
  const EPromise = makeEPromiseClass(Promise);
  const fn = () => 'hello';
  fn.a = (n) => n + 1;
  fn[2] = (n1, n2) => n1 * n2;
  const ep = EPromise.resolve(fn);
  t.equal(await ep.post('a', [3]), 4);
  t.equal(await ep.post(2, [3, 4]), 12);
  t.equal(await ep.post(undefined, []), 'hello');
  t.end();
});

test('invoke', async t => {
  const EPromise = makeEPromiseClass(Promise);
  const fn = () => 'hello';
  fn.a = (n) => n + 1;
  fn[2] = (n1, n2) => n1 * n2;
  const ep = EPromise.resolve(fn);
  t.equal(await ep.invoke('a', 3), 4);
  t.equal(await ep.invoke(2, 3, 4), 12);
  t.equal(await ep.invoke(undefined), 'hello');
  t.end();
});

test('fcall', async t => {
  const EPromise = makeEPromiseClass(Promise);
  const ep = EPromise.resolve((a, b) => a * b);
  t.equal(await ep.fcall(3, 6), 18);
  t.end();
});

test('fapply', async t => {
  const EPromise = makeEPromiseClass(Promise);
  const ep = EPromise.resolve((a, b) => a * b);
  t.equal(await ep.fapply([3, 6]), 18);
  t.end();
});