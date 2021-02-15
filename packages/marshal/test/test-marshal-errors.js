import '@agoric/install-ses';
import test from 'ava';
import { makeMarshal } from '../src/marshal';

// this only includes the tests that do not use liveSlots

test('serialize errors', t => {
  const m = makeMarshal();
  const ser = val => m.serialize(val);

  const emptyem = harden(Error());
  t.deepEqual(ser(emptyem), {
    body:
      '{"@qclass":"error","errorId":"error:anon-marshal#1","message":"","name":"Error"}',
    slots: [],
  });

  const em = harden(ReferenceError('msg'));
  t.deepEqual(ser(em), {
    body:
      '{"@qclass":"error","errorId":"error:anon-marshal#2","message":"msg","name":"ReferenceError"}',
    slots: [],
  });
});

test('unserialize errors', t => {
  const m = makeMarshal();
  const uns = body => m.unserialize({ body, slots: [] });

  const em1 = uns(
    '{"@qclass":"error","message":"msg","name":"ReferenceError"}',
  );
  t.truthy(em1 instanceof ReferenceError);
  t.is(em1.message, 'msg');
  t.truthy(Object.isFrozen(em1));

  const em2 = uns('{"@qclass":"error","message":"msg2","name":"TypeError"}');
  t.truthy(em2 instanceof TypeError);
  t.is(em2.message, 'msg2');

  const em3 = uns('{"@qclass":"error","message":"msg3","name":"Unknown"}');
  t.truthy(em3 instanceof Error);
  t.is(em3.message, 'msg3');
});
