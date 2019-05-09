import { test } from 'tape-promise/tape';
import { makeResolvers } from '../../../src/kernel/commsSlots/state/makeResolvers';

test('resolvers add and get', t => {
  const resolvers = makeResolvers();
  const promiseSlot = { type: 'promise', id: 1 };
  const resolverSlot = { type: 'resolver', id: 2 };
  resolvers.add(promiseSlot, resolverSlot);
  const actualResolver = resolvers.getResolver(promiseSlot);
  t.equal(actualResolver, resolverSlot);
  t.end();
});
