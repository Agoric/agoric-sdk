import test from 'ava';

test('1 + 1 = 2', t => {
  t.is(1 + 1, 2);
});

test('string concatenation', t => {
  t.is('hello' + ' world', 'hello world');
});
