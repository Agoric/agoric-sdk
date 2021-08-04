import '@agoric/install-ses';
import test from 'ava';

import { dump } from '../src/repl.js';

// Taken from https://github.com/endojs/endo/tree/main/packages/ses/test/error/test-assert-log.js#L414
test('dump: the @erights challenge', async t => {
  const superTagged = { [Symbol.toStringTag]: 'Tagged' };
  const subTagged = { __proto__: superTagged };
  const subTaggedNonEmpty = { __proto__: superTagged, foo: 'x' };

  const challenges = [
    Promise.resolve('x'),
    function foo() {},
    '[hilbert]',
    undefined,
    'undefined',
    URIError('wut?'),
    [33n, Symbol('foo'), Symbol.for('bar'), Symbol.asyncIterator],
    {
      NaN,
      Infinity,
      neg: -Infinity,
    },
    2 ** 54,
    { superTagged, subTagged, subTaggedNonEmpty },
  ];
  t.is(
    dump(challenges),
    '[[Promise],[Function foo],"[hilbert]",undefined,"undefined",[URIError: wut?],[33n,Symbol(foo),Symbol(bar),Symbol(Symbol.asyncIterator)],{"NaN":NaN,"Infinity":Infinity,"neg":-Infinity},18014398509481984,{"superTagged":{[Symbol(Symbol.toStringTag)]:"Tagged"},"subTagged":[Object Tagged]{},"subTaggedNonEmpty":[Object Tagged]{"foo":"x"}}]',
  );
  t.is(
    dump(challenges, '  '),
    `\
[
  [Promise],
  [Function foo],
  "[hilbert]",
  undefined,
  "undefined",
  [URIError: wut?],
  [
    33n,
    Symbol(foo),
    Symbol(bar),
    Symbol(Symbol.asyncIterator)
  ],
  {
    "NaN": NaN,
    "Infinity": Infinity,
    "neg": -Infinity
  },
  18014398509481984,
  {
    "superTagged": {
      [Symbol(Symbol.toStringTag)]: "Tagged"
    },
    "subTagged": [Object Tagged] {},
    "subTaggedNonEmpty": [Object Tagged] {
      "foo": "x"
    }
  }
]`,
  );
});
