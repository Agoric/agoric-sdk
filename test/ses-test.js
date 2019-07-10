import { test } from 'tape-promise/tape';
import * as SES from 'ses';

import { parse } from '@agoric/babel-parser';
import generate from '@babel/generator';

import makeBangTransformer from '../src';

test('Promise is augmented', t => {
  try {
    t.equals(typeof Promise.resolve(123).get, 'function');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('infix bang is disabled by default', t => {
  try {
    const s = SES.makeSESRootRealm();
    t.throws(
      () =>
        s.evaluate('"abc"!length', {
          E(obj) {
            return obj;
          },
        }),
      SyntaxError,
    );
    if (false) {
      // FIXME: (1 , eval) is not a function.
      t.equals(s.evaluate('(1,eval)("123")'), 123);
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('infix bang can be enabled', async t => {
  try {
    const s = SES.makeSESRootRealm({
      transforms: makeBangTransformer(parse, generate),
    });
    t.equals(await s.evaluate('"abc"!length'), 3);
    t.equals(await s.evaluate('({foo() { return "hello"; }})!foo()'), 'hello');
    t.equals(await s.evaluate('(() => "world")!()'), 'world');
    t.equals(await s.evaluate('["a", "b", "c"]![2]'), 'c');

    if (false) {
      // FIXME: Direct eval is not supported.
      t.equals(await s.evaluate(`eval('"abc"!length')`), 3);
      t.equals(await s.evaluate(`eval('eval(\\'"abc"!length\\')')`), 3);
    }
    if (false) {
      // FIXME: (1 , eval) is not a function.
      t.equals(await s.evaluate(`(1,eval)('"abc"!length')`), 3);
      t.equals(await s.evaluate(`(1,eval)('(1,eval)(\\'"abc"!length\\')')`), 3);
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
