// FIXME importing this breaks line numbering in stack traces
// (all code is in one line, probably a bug in resolving source map)
// import '@endo/init/debug.js';

import test from 'ava';

type Foo = {
  a: string;
  b: number;
  c: unknown;
};

test('impossible', t => {
  // FIXME Ava's report says this happens on line 1
  // It must be losing the line breaks
  t.fail();
});
