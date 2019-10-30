import { test } from 'tape-promise/tape';
import { makeSharingService } from '../../../../more/sharing/sharing';

test('Sharing creation', t => {
  const sharingService = makeSharingService();
  const first = sharingService.createBoard('first');
  t.assert(sharingService.validate(first));
  t.end();
});

test('Sharing repeated creation', t => {
  const sharingService = makeSharingService();
  const first = sharingService.createBoard('first');
  t.assert(sharingService.validate(first));
  t.throws(
    _ => sharingService.createBoard('first'),
    /already exists/,
    'should throw on repeated call.',
  );
  t.end();
});

test('Sharing grab value', t => {
  const sharingService = makeSharingService();
  const firstName = 'first';
  const first = sharingService.createBoard(firstName);
  t.assert(sharingService.validate(first));
  const second = sharingService.grabBoard(firstName);
  t.assert(sharingService.validate(second));
  t.equals(second, first);
  t.throws(
    _ => sharingService.grabBoard(firstName),
    /has already been collected/,
    'should throw on repeated call.',
  );
  t.end();
});

test('Sharing validate non service', t => {
  const sharingService = makeSharingService();
  t.throws(
    _ => sharingService.validate([]),
    /Unrecognized board:/,
    'throws on non sharing service.',
  );
  t.end();
});
