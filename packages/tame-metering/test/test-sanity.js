import '../src/install-global-metering';
import test from 'tape-promise/tape';

test('symbol properties', t => {
  t.assert(RegExp[Symbol.species], 'RegExp[Symbol.species] is kept');
  t.end();
});

function foo(_bar) {
  // eslint-disable-next-line no-eval
  return eval('_bar');
}

test('direct eval', t => {
  t.equals(foo(123), 123, 'direct eval succeeds');
  t.end();
});
