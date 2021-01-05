// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { assertOfferResult } from '../../src/assertOfferResult';

test('assertOfferResult', async t => {
  const mockSeat = {
    getOfferResult: () => 'result',
  };
  await t.notThrowsAsync(() => assertOfferResult(mockSeat, 'result'));
  await t.throwsAsync(() => assertOfferResult(mockSeat, 'not result'), {
    message: 'offerResult ((a string)) did not equal expected: (a string)',
  });
});
