import { test } from 'tape-promise/tape';
import { makeSubscribers } from '../../../src/kernel/commsSlots/state/makeSubscribers';

test('subscribers add and get', t => {
  const subscribers = makeSubscribers();
  subscribers.add(22, 'abc');
  subscribers.add(23, 'abc');
  const promiseSubscribers = subscribers.get(22);
  t.deepEqual(promiseSubscribers, ['abc']);
  t.end();
});
