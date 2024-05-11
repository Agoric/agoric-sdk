import test from 'ava';

import { createSHA256 } from '../src/hasher.js';

test('createSHA256', t => {
  t.is(
    createSHA256().finish(),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );

  const h1 = createSHA256('a');
  t.is(
    h1.finish(),
    'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
  );

  const h2 = createSHA256();
  h2.add('a');
  t.is(
    h2.finish(),
    'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
  );

  const h3 = createSHA256('a');
  h3.add('b');
  t.is(
    h3.finish(),
    'fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603',
  );

  const h4 = createSHA256();
  h4.finish();
  t.throws(() => h4.add('a'));
  t.throws(() => h4.finish());
});
