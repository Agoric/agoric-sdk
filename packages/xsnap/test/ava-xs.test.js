import fs from 'node:fs';
import vm from 'node:vm';

import ava from 'ava';

const avaAssertSource = fs.readFileSync(
  new URL('../src/avaAssertXS.js', import.meta.url),
  'utf8',
);

const makeAvaXsTest = () => {
  const context = {
    console,
    Error,
    JSON,
    Object,
    Promise,
    Reflect,
  };
  context.globalThis = context;
  vm.runInNewContext(avaAssertSource, context, {
    filename: 'avaAssertXS.js',
  });
  return context.test;
};

ava('deepEqual reports ok for deeply equal objects', async t => {
  const test = makeAvaXsTest();
  const messages = [];
  const harness = test.createHarness(msg => messages.push(msg));

  test(
    'specimen',
    at => {
      at.deepEqual(
        { num: 1, int: 2n, am: { brand: null, value: 3n } },
        { num: 1, int: 2n, am: { brand: null, value: 3n } },
      );
    },
    harness,
  );

  await harness.run('specimen');

  t.deepEqual(messages, [
    { status: 'ok', id: 1, message: 'should be deep equal: null' },
  ]);
});

ava('deepEqual reports not ok for deeply different objects', async t => {
  const test = makeAvaXsTest();
  const messages = [];
  const harness = test.createHarness(msg => messages.push(msg));

  test(
    'specimen',
    at => {
      at.deepEqual({ num: 1 }, { num: 2 });
    },
    harness,
  );

  await harness.run('specimen');

  t.is(messages.length, 1);
  t.is(messages[0].status, 'not ok');
});
