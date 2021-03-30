// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { captureNum } from '../../../src/display/natValue/helpers/captureNum';

test('captureNum', t => {
  t.deepEqual(captureNum('200'), { left: '200', right: '' });
  t.deepEqual(captureNum('200.00'), { left: '200', right: '00' });
  t.deepEqual(captureNum('0200.00'), { left: '0200', right: '00' });
  t.deepEqual(captureNum('200.020'), { left: '200', right: '020' });
});

test('captureNum neg num throws', t => {
  t.throws(() => captureNum('-200'), {
    message: /.* must be a non-negative decimal number/,
  });
  t.throws(() => captureNum('-200.00'), {
    message: /.* must be a non-negative decimal number/,
  });
  t.throws(() => captureNum('-0200.00'), {
    message: /.* must be a non-negative decimal number/,
  });
  t.throws(() => captureNum('-200.020'), {
    message: /.* must be a non-negative decimal number/,
  });
});

test('captureNum non-number throws', t => {
  t.throws(() => captureNum('a'), {
    message: /.* must be a non-negative decimal number/,
  });
  t.throws(() => captureNum({}), {
    message: /.* must be a non-negative decimal number/,
  });
});
