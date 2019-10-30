import { test } from 'tape-promise/tape';
import * as acorn from 'acorn';
import eventualSend from '..';

test('parser', async t => {
  try {
    const MyParser = acorn.Parser.extend(eventualSend(acorn));
    const parser = src => MyParser.parse(src);

    // FIXME: Compare parse trees.
    t.ok(parser('x ~. p(y, z, q)'), 'post');
    t.ok(parser('x ~. [i](y, z)'), 'computed post');
    t.ok(parser('x ~. (y, z)'), 'apply');
    t.ok(parser('x ~. ()'), 'apply nothing');
    t.ok(parser('x ~. p'), 'get');
    t.ok(parser('x ~. [i]'), 'computed get');
    t.ok(parser('x ~. p = v'), 'put');
    t.ok(parser('x ~. [i] = v'), 'computed put');
    t.ok(parser('delete x ~. p'), 'delete');
    t.ok(parser('delete x ~.[p]'), 'computed delete');
    t.ok(parser('x~.\n  p'), 'no asi');
    t.ok(parser('x\n  /* foo */ ~.p'), 'no asi2');
    t.ok(parser('x~.p~.()'), 'chained get/post');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
