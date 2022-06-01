// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { assertOfferResult } from '../../src/assertOfferResult.js';

test('assertOfferResult', async t => {
  /** @type {UserSeat} */
  const mockSeat = {
    // @ts-expect-error mock
    getOfferResult: () => 'result',
  };
  await t.notThrowsAsync(() => assertOfferResult(mockSeat, 'result'));
  await t.throwsAsync(() => assertOfferResult(mockSeat, 'not result'), {
    message: /offerResult (.*) did not equal expected: .*/,
  });
});
