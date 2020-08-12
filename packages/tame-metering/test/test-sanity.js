import '../src/install-global-metering';
import test from 'ava';

test('symbol properties', t => {
  t.assert(RegExp[Symbol.species], 'RegExp[Symbol.species] is kept');
 return; // t.end();
});

function foo(_bar) {
  // eslint-disable-next-line no-eval
  return eval('_bar');
}

test('direct eval', t => {
 t.is(foo(123), 123, 'direct eval succeeds');
 return; // t.end();
});
