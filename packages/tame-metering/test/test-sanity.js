import '../src/install-global-metering';
import test from 'ava';

test('symbol properties', t => {
  t.truthy(RegExp[Symbol.species], 'RegExp[Symbol.species] is kept');
});

function foo(_bar) {
  // eslint-disable-next-line no-eval
  return eval('_bar');
}

test('direct eval', t => {
  t.is(foo(123), 123, 'direct eval succeeds');
});
