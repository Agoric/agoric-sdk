import { test } from 'tape';
import * as babelParser from '@agoric/babel-parser';
import babelGenerate from '@babel/generator';
import { makeTransform } from '../src';

test('transformer', t => {
  const source = `let p = bob~.foo(arg1, arg2);`;
  const transformer = makeTransform(babelParser, babelGenerate);
  const output = transformer(source);
  t.equal(
    output,
    `let p = HandledPromise.applyMethod(bob, "foo", [arg1, arg2]);`,
  );
  t.end();
});
