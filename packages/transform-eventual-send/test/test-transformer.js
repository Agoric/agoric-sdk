import test from 'ava';
import * as babelParser from '@agoric/babel-parser';
import babelGenerate from '@babel/generator';
import { makeTransform } from '../src';

test('transformer', t => {
  const source = `let p = bob~.foo(arg1, arg2);`;
  const transformer = makeTransform(babelParser, babelGenerate);
  const output = transformer(source);
  t.is(output, `let p = HandledPromise.applyMethod(bob, "foo", [arg1, arg2]);`);
  t.is(
    transformer(output),
    `let p = HandledPromise.applyMethod(bob, "foo", [arg1, arg2]);`,
  );
  t.is(transformer('123;456'), '123;456;');
  t.is(transformer('123;'), '123;');
  t.is(transformer('123'), '123;');
  t.is(
    transformer(`"abc"~.length`),
    'HandledPromise.get("abc", "length");',
    '.get() works',
  );
  t.is(
    transformer(`({foo(nick) { return "hello " + nick; }})~.foo('person')`),
    `HandledPromise.applyMethod({ foo(nick) {return "hello " + nick;} }, "foo", ['person']);`,
    '.applyMethod() works',
  );
  t.is(
    transformer(`((punct) => "world" + punct)~.('!')`),
    `HandledPromise.applyFunction(punct => "world" + punct, ['!']);`,
    '.applyFunction() works',
  );
  t.is(
    transformer(`["a", "b", "c"]~.[2]`),
    `HandledPromise.get(["a", "b", "c"], 2);`,
    'computed .get works',
  );
  t.is(
    transformer(
      `({foo(greeting) { return greeting + ' world';}})~.foo~.('hello')`,
    ),
    `HandledPromise.applyFunction(HandledPromise.get({ foo(greeting) {return greeting + ' world';} }, "foo"), ['hello']);`,
    'double eventual send works',
  );
});
