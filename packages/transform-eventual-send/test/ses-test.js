/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */
import { test } from 'tape-promise/tape';
import SES from 'ses';

import * as babelParser from '@agoric/babel-parser';
import babelGenerate from '@babel/generator';

import eventualSend from '@agoric/acorn-eventual-send';
import * as acorn from 'acorn';
import * as astring from 'astring';

import makeEventualSendTransformer from '../src';

// FIXME: This should be unnecessary when SES has support
// for passing `evaluateProgram` through to the rewriter state.
const closeOverSES = (transforms, ses) =>
  transforms.forEach(t => t.closeOverSES && t.closeOverSES(ses));

const AcornParser = acorn.Parser.extend(eventualSend(acorn));
const acornParser = {
  parse(src) {
    return AcornParser.parse(src);
  },
  parseExpression(src) {
    return AcornParser.parseExpressionAt(src, 0);
  },
};
const acornGenerate = (ast, _options, _src) => {
  const code = astring.generate(ast);
  return { code };
};

test('eventual send is disabled by default', t => {
  try {
    const s = SES.makeSESRootRealm();
    t.throws(
      () =>
        s.evaluate('"abc"~.length', {
          HandledPromise: {
            get(target, _prop) {
              return target;
            },
          },
        }),
      SyntaxError,
      `eventual send fails`,
    );
    t.equals(s.evaluate('(1,eval)("123")'), 123, `indirect eval works`);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('expression source is parsable', async t => {
  try {
    const s = SES.makeSESRootRealm({
      transforms: makeEventualSendTransformer(babelParser, babelGenerate),
    });
    t.equal(
      s.evaluate(`123; 456`, {}, { sourceType: 'program' }),
      456,
      'program succeeds',
    );
    t.equal(
      s.evaluate(`123;`, {}, { sourceType: 'program' }),
      123,
      'semicolon program succeeds',
    );
    /* FIXME: Do when Realms honour sourceType.
    t.throws(
      () => s.evaluate(`123;`, {}, { sourceType: 'expression' }),
      SyntaxError,
      'non-expression fails',
    );
    */
    t.equal(
      s.evaluate(`123`, {}, { sourceType: 'expression' }),
      123,
      'expression succeeds',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('eventual send can be enabled twice', async t => {
  try {
    const transforms = [
      ...makeEventualSendTransformer(babelParser, babelGenerate),
      ...makeEventualSendTransformer(babelParser, babelGenerate),
    ];
    const s = SES.makeSESRootRealm({ transforms });
    closeOverSES(transforms, s);
    t.equal(
      await s.evaluate('"abc"~.[2]'),
      'c',
      `babel double transform works`,
    );
    const transforms2 = [
      ...makeEventualSendTransformer(acornParser, acornGenerate),
      ...makeEventualSendTransformer(acornParser, acornGenerate),
    ];
    const s2 = SES.makeSESRootRealm({ transforms: transforms2 });
    closeOverSES(transforms2, s2);
    t.equal(
      await s2.evaluate('"abc"~.[2]'),
      'c',
      `acorn double transform works`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('eventual send can be enabled', async t => {
  try {
    for (const [name, parser, generate] of [
      ['babel', babelParser, babelGenerate],
      ['acorn', acornParser, acornGenerate],
    ]) {
      const transforms = [
        ...makeEventualSendTransformer(parser, generate),
      ];
      const s = SES.makeSESRootRealm({ transforms });
      closeOverSES(transforms, s);

      // console.log(parser('"abc"~.length', { plugins: ['eventualSend'] }));
      t.equals(await s.evaluate(`"abc"~.length`), 3, `${name} .get() works`);
      t.equals(
        await s.evaluate(
          `({foo(nick) { return "hello " + nick; }})~.foo('person')`,
        ),
        'hello person',
        `${name} .applyMethod() works`,
      );
      t.equals(
        await s.evaluate(`((punct) => "world" + punct)~.('!')`),
        'world!',
        `${name} .applyFunction() works`,
      );
      t.equals(
        await s.evaluate(`["a", "b", "c"]~.[2]`),
        'c',
        `${name} computed .get works`,
      );

      t.equals(
        await s.evaluate(
          `({foo(greeting) { return greeting + ' world';}})~.foo~.('hello')`,
        ),
        'hello world',
        `${name} double eventual send evaluates`,
      );

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
          await s.evaluate(`eval('"abc"~.length')`),
          3,
          `${name} direct eval works`,
        ),
      );
      await directEval(async () =>
        t.equals(
          await s.evaluate(`eval('eval(\\'"abc"~.length\\')')`),
          3,
          `${name} nested direct eval works`,
        ),
      );

      t.equals(
        await s.evaluate(`(1,eval)('"abc"~.length')`),
        3,
        `${name} indirect eval works`,
      );
      t.equals(
        await s.evaluate(`(1,eval)('(1,eval)(\\'"abc"~.length\\')')`),
        3,
        `${name} nested indirect eval works`,
      );
    }
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
