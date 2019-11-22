import { test } from 'tape-promise/tape';
import { makeSharingService } from '../../../../more/sharing/sharing';

test('Sharing creation', t => {
  const sharingService = makeSharingService();
  const first = sharingService.createSharedMap('first');
  t.assert(sharingService.validate(first));
  t.end();
});

test('Sharing repeated creation', t => {
  const sharingService = makeSharingService();
  const first = sharingService.createSharedMap('first');
  t.assert(sharingService.validate(first));
  t.throws(
    _ => sharingService.createSharedMap('first'),
    /already exists/,
    'should throw on repeated call.',
  );
  t.end();
});

test('Sharing grab value', t => {
  const sharingService = makeSharingService();
  const firstName = 'first';
  const first = sharingService.createSharedMap(firstName);
  t.assert(sharingService.validate(first));
  const second = sharingService.grabSharedMap(firstName);
  t.assert(sharingService.validate(second));
  t.equals(second, first);
  t.throws(
    _ => sharingService.grabSharedMap(firstName),
    /has already been collected/,
    'should throw on repeated call.',
  );
  t.end();
});

test('Sharing validate non service', t => {
  const sharingService = makeSharingService();
  t.throws(
    _ => sharingService.validate([]),
    /Unrecognized sharedMap:/,
    'throws on non sharing service.',
  );
  t.end();
});
