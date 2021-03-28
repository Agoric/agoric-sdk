import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeSharingService } from '../../src/sharing';

test('Sharing creation', t => {
  const sharingService = makeSharingService();
  const first = sharingService.createSharedMap('first');
  t.assert(sharingService.validate(first));
});

test('Sharing repeated creation', t => {
  const sharingService = makeSharingService();
  const first = sharingService.createSharedMap('first');
  t.assert(sharingService.validate(first));
  t.throws(
    _ => sharingService.createSharedMap('first'),
    { message: /already exists/ },
    'should throw on repeated call.',
  );
});

test('Sharing grab value', t => {
  const sharingService = makeSharingService();
  const firstName = 'first';
  const first = sharingService.createSharedMap(firstName);
  t.assert(sharingService.validate(first));
  const second = sharingService.grabSharedMap(firstName);
  t.assert(sharingService.validate(second));
  t.is(second, first);
  t.throws(
    _ => sharingService.grabSharedMap(firstName),
    { message: /has already been collected/ },
    'should throw on repeated call.',
  );
});

test('Sharing validate non service', t => {
  const sharingService = makeSharingService();
  t.throws(
    _ => sharingService.validate([]),
    { message: /Unrecognized sharedMap:/ },
    'throws on non sharing service.',
  );
});
