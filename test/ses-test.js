/* eslint-disable no-await-in-loop */
import { test } from 'tape-promise/tape';
import * as SES from 'ses';

import maybeExtendPromise from '@agoric/eventual-send';

import * as babelParser from '@agoric/babel-parser';
import babelGenerate from '@babel/generator';

import { Parser as AcornRawParser } from 'acorn';
import acornInfixBang from '@agoric/acorn-infix-bang';
import * as astring from 'astring';

import makeBangTransformer from '../src';

const shims = [`(${maybeExtendPromise})(Promise)`];

const AcornParser = AcornRawParser.extend(acornInfixBang());
const acornParser = {
  parse(src) { return AcornParser.parse(src); },
  parseExpression(src) { return AcornParser.parseExpressionAt(src, 0); },
};
const acornGenerate = (ast, _options, _src) => ({
  code: astring.generate(ast),
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
      `infix bang fails`,
    );
    t.equals(s.evaluate('(1,eval)("123")'), 123, `indirect eval works`);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('infix bang can be enabled twice', async t => {
  try {
    const s = SES.makeSESRootRealm({
      shims,
      transforms: [
        ...makeBangTransformer(babelParser, babelGenerate),
        ...makeBangTransformer(babelParser, babelGenerate),
      ],
    });
    t.equal(await s.evaluate('"abc"![2]'), 'c', `babel double transform works`);
    const s2 = SES.makeSESRootRealm({
      shims,
      transforms: [
        ...makeBangTransformer(acornParser, acornGenerate),
        ...makeBangTransformer(acornParser, acornGenerate),
      ],
    });
    t.equal(
      await s2.evaluate('"abc"![2]'),
      'c',
      `acorn double transform works`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('infix bang can be enabled', async t => {
  try {
    for (const [name, parser, generate] of [
      ['babel', babelParser, babelGenerate],
      ['acorn', acornParser, acornGenerate],
    ]) {
      const s = SES.makeSESRootRealm({
        shims,
        transforms: makeBangTransformer(parser, generate),
      });
      t.equals(await s.evaluate(`"abc"!length`), 3, `${name} .get() works`);
      t.equals(
        await s.evaluate(
          `({foo(nick) { return "hello " + nick; }})!foo('person')`,
        ),
        'hello person',
        `${name} .post() works`,
      );
      t.equals(
        await s.evaluate(`((punct) => "world" + punct)!('!')`),
        'world!',
        `${name} .post(undefined, ...) works`,
      );
      t.equals(
        await s.evaluate(`["a", "b", "c"]![2]`),
        'c',
        `${name} computed .get works`,
      );

      t.equals(
        await s.evaluate(
          `({foo(greeting) { return greeting + ' world';}})!foo!('hello')`,
        ),
        'hello world',
        `${name} double bang evaluates`,
      );

      const o = { gone: 'away', here: 'world' };
      t.equals(
        await s.evaluate('o => delete o!gone')(o),
        true,
        `${name} .delete works`,
      );
      t.equals(o.gone, undefined, `${name} .delete actually does`);
      t.equals(o.here, 'world', `${name} .delete other property stays`);

      t.equals(
        await s.evaluate(`o => (o!back = 'here')`)(o),
        'here',
        `${name} .put works`,
      );
      t.equals(o.back, 'here', `${name} .put changes assignment`);

      const noReject = fn => fn();

      let directEval = noReject;
      if (true) {
        // FIXME: Should be noReject.
        directEval = fn =>
          t.rejects(
            fn(),
            /possible direct eval expression rejected/,
            `${name} direct eval fails (FIXME)`,
          );
      }
      await directEval(async () =>
        t.equals(
          await s.evaluate(`eval('"abc"!length')`),
          3,
          `${name} direct eval works`,
        ),
      );
      await directEval(async () =>
        t.equals(
          await s.evaluate(`eval('eval(\\'"abc"!length\\')')`),
          3,
          `${name} nested direct eval works`,
        ),
      );

      t.equals(
        await s.evaluate(`(1,eval)('"abc"!length')`),
        3,
        `${name} indirect eval works`,
      );
      t.equals(
        await s.evaluate(`(1,eval)('(1,eval)(\\'"abc"!length\\')')`),
        3,
        `${name} nested indirect eval works`,
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
