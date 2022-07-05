// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { assertOfferResult } from '../../src/assertOfferResult.js';

test('assertOfferResult', async t => {
  /** @type {UserSeat} */
  // @ts-expect-error mock
  const mockSeat = {
    getOfferResult: () => 'result',
  };

  // The following two ts-ignore should be ts-expect-error, but whether
  // an error is reported here seems to depend on context. We use
  // ts-ignore to suppress the error whether it is reported or not.

  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore ERef args should be accepted for PromiseLike param
  await t.notThrowsAsync(() => assertOfferResult(mockSeat, 'result'));
  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore ERef args should be accepted for PromiseLike param
  await t.throwsAsync(() => assertOfferResult(mockSeat, 'not result'), {
    message: /offerResult (.*) did not equal expected: .*/,
  });
});
