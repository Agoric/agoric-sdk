import test from 'ava';

test('like', t => {
  t.throws(() => t.like({}, {}), { message: 'not implemented' });
});

test('deepEquals', t => {
  t.deepEqual({}, {});
  t.deepEqual(
    { num: 1, int: 2n, am: { brand: null, value: 3n } },
    { num: 1, int: 2n, am: { brand: null, value: 3n } },
  );
  t.throws(() => t.deepEqual({ num: 1 }, { num: 2 }));
});
