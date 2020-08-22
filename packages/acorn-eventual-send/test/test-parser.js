import test from 'ava';
import * as acorn from 'acorn';
import eventualSend from '..';

test('parser', async t => {
  const MyParser = acorn.Parser.extend(eventualSend(acorn));
  const parser = src => MyParser.parse(src);

  // FIXME: Compare parse trees.
  t.truthy(parser('x ~. p(y, z, q)'), 'post');
  t.truthy(parser('x ~. [i](y, z)'), 'computed post');
  t.truthy(parser('x ~. (y, z)'), 'apply');
  t.truthy(parser('x ~. ()'), 'apply nothing');
  t.truthy(parser('x ~. p'), 'get');
  t.truthy(parser('x ~. [i]'), 'computed get');
  t.truthy(parser('x ~. p = v'), 'put');
  t.truthy(parser('x ~. [i] = v'), 'computed put');
  t.truthy(parser('delete x ~. p'), 'delete');
  t.truthy(parser('delete x ~.[p]'), 'computed delete');
  t.truthy(parser('x~.\n  p'), 'no asi');
  t.truthy(parser('x\n  /* foo */ ~.p'), 'no asi2');
  t.truthy(parser('x~.p~.()'), 'chained get/post');
});
