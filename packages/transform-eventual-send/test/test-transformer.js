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
  t.equal(
    transformer(output),
    `let p = HandledPromise.applyMethod(bob, "foo", [arg1, arg2]);`,
  );
  t.equal(transformer('123;456'), '123;456;');
  t.equal(transformer('123;'), '123;');
  t.equal(transformer('123'), '123;');
  t.equal(
    transformer(`"abc"~.length`),
    'HandledPromise.get("abc", "length");',
    '.get() works',
  );
  t.equal(
    transformer(`({foo(nick) { return "hello " + nick; }})~.foo('person')`),
    `HandledPromise.applyMethod({ foo(nick) {return "hello " + nick;} }, "foo", ['person']);`,
    '.applyMethod() works',
  );
  t.equal(
    transformer(`((punct) => "world" + punct)~.('!')`),
    `HandledPromise.applyFunction(punct => "world" + punct, ['!']);`,
    '.applyFunction() works',
  );
  t.equal(
    transformer(`["a", "b", "c"]~.[2]`),
    `HandledPromise.get(["a", "b", "c"], 2);`,
    'computed .get works',
  );
  t.equal(
    transformer(
      `({foo(greeting) { return greeting + ' world';}})~.foo~.('hello')`,
    ),
    `HandledPromise.applyFunction(HandledPromise.get({ foo(greeting) {return greeting + ' world';} }, "foo"), ['hello']);`,
    'double eventual send works',
  );
  t.end();
});
