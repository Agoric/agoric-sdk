#!/usr/bin/env node --loader tsx --no-warnings

type Foo = {
  a: string;
  b: number;
  c: unknown;
};

throw Error('demo');
