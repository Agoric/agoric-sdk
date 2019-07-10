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

test('infix bang can be enabled twice', async t => {
  try {
    const s = SES.makeSESRootRealm({
      transforms: [
        ...makeBangTransformer(parse, generate),
        ...makeBangTransformer(parse, generate),
      ],
    });
    t.equal(await s.evaluate('"abc"![2]'), 'c');
    const s2 = SES.makeSESRootRealm({
      transforms: [
        ...makeBangTransformer(parse, generate),
        ...makeBangTransformer(parse, generate),
      ],
    });
    t.equal(await s2.evaluate('"abc"![2]'), 'c');
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
    t.equals(await s.evaluate(`"abc"!length`), 3);
    t.equals(
      await s.evaluate(
        `({foo(nick) { return "hello " + nick; }})!foo('person')`,
      ),
      'hello person',
    );
    t.equals(await s.evaluate(`((punct) => "world" + punct)!('!')`), 'world!');
    t.equals(await s.evaluate(`["a", "b", "c"]![2]`), 'c');

    const o = { gone: 'away', here: 'world' };
    t.equals(await s.evaluate('o => delete o!gone')(o), true);
    t.equals(o.gone, undefined);
    t.equals(o.here, 'world');

    t.equals(await s.evaluate(`o => (o!back = 'here')`)(o), 'here');
    t.equals(o.back, 'here');

    const noReject = fn => fn();

    let directEval = noReject;
    if (true) {
      // FIXME: Should be noReject.
      directEval = fn => t.rejects(fn(), /possible direct eval expression rejected/);
    }
    await directEval(async () =>
      t.equals(await s.evaluate(`eval('"abc"!length')`), 3),
    );
    await directEval(async () =>
      t.equals(await s.evaluate(`eval('eval(\\'"abc"!length\\')')`), 3),
    );

    let indirEval = noReject;
    if (true) {
      // FIXME: Should be noReject.
      indirEval = fn => t.rejects(fn(), /\(1 , eval\) is not a function/);
    }
    await indirEval(async () =>
      t.equals(await s.evaluate(`(1,eval)('"abc"!length')`), 3),
    );
    await indirEval(async () =>
      t.equals(await s.evaluate(`(1,eval)('(1,eval)(\\'"abc"!length\\')')`), 3),
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
