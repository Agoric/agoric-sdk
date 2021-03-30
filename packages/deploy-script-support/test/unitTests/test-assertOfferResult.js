// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { assertOfferResult } from '../../src/assertOfferResult';

test('assertOfferResult', async t => {
  const mockSeat = {
    getOfferResult: () => 'result',
  };
  await t.notThrowsAsync(() => assertOfferResult(mockSeat, 'result'));
  await t.throwsAsync(() => assertOfferResult(mockSeat, 'not result'), {
    message: /offerResult (.*) did not equal expected: .*/,
  });
});
