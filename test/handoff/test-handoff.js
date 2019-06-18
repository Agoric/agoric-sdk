import { test } from 'tape-promise/tape';
import { makeHandoffService } from '../../more/handoff/handoff';

test('Handoff creation', t => {
  const handoffService = makeHandoffService();
  const first = handoffService.createEntry('first');
  t.assert(handoffService.validate(first));
  t.end();
});

test('Handoff repeated creation', t => {
  const handoffService = makeHandoffService();
  const first = handoffService.createEntry('first');
  t.assert(handoffService.validate(first));
  t.throws(
    _ => handoffService.createEntry('first'),
    /already exists/,
    'should throw on repeated call.',
  );
  t.end();
});

test('Handoff grab value', t => {
  const handoffService = makeHandoffService();
  const firstName = 'first';
  const first = handoffService.createEntry(firstName);
  t.assert(handoffService.validate(first));
  const second = handoffService.grab(firstName);
  t.assert(handoffService.validate(second));
  t.equals(second, first);
  t.throws(
    _ => handoffService.grab(firstName),
    /has already been collected/,
    'should throw on repeated call.',
  );
  t.end();
});

test('Handoff validate non service', t => {
  const handoffService = makeHandoffService();
  t.throws(
    _ => handoffService.validate([]),
    /Unrecognized board:/,
    'throws on non handoff service.',
  );
  t.end();
});
