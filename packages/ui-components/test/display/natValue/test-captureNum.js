// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env-ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { captureNum } from '../../../src/display/natValue/helpers/captureNum';

test('captureNum', t => {
  t.deepEqual(captureNum('200'), { left: '200', right: '' });
  t.deepEqual(captureNum('200.00'), { left: '200', right: '00' });
  t.deepEqual(captureNum('0200.00'), { left: '0200', right: '00' });
  t.deepEqual(captureNum('200.020'), { left: '200', right: '020' });
});

test('captureNum neg num throws', t => {
  t.throws(() => captureNum('-200'), {
    message: '(a string) must be a non-negative decimal number',
  });
  t.throws(() => captureNum('-200.00'), {
    message: '(a string) must be a non-negative decimal number',
  });
  t.throws(() => captureNum('-0200.00'), {
    message: '(a string) must be a non-negative decimal number',
  });
  t.throws(() => captureNum('-200.020'), {
    message: '(a string) must be a non-negative decimal number',
  });
});

test('captureNum non-number throws', t => {
  t.throws(() => captureNum('a'), {
    message: '(a string) must be a non-negative decimal number',
  });
  t.throws(() => captureNum({}), {
    message: '(an object) must be a non-negative decimal number',
  });
});
