import '@endo/init';

// eslint-disable-next-line import/order
import test from 'ava';
import { Far } from '@endo/far';
import { TimeMath } from '../src/timeMath.js';

/**
 * @typedef {import('../src/types').TimerBrand} TimerBrand
 * @typedef {import('../src/types').Timestamp} Timestamp
 * @typedef {import('../src/types').RelativeTime} RelativeTime
 * @typedef {import('../src/types').TimestampValue} TimestampValue
 * @typedef {import('../src/types').TimeMathType} TimeMathType
 *
 */

// TODO Although TimeMath is altogether rather simple, to test it well
// requires testing an explosion of combinations. It is an ideal case
// for property-based testing, so we should eventually do that.

const makeTimerBrand = name => {
  return Far(name, { isMyTimerService: () => false, isMyClock: () => false });
};

test('timeMath same label', t => {
  /** @type {TimerBrand} */
  const timerBrand = makeTimerBrand('fake timer brand');
  const t100 = harden({ timerBrand, absValue: 100n });
  const r3 = harden({ timerBrand, relValue: 3n });
  const t103 = harden({ timerBrand, absValue: 103n });
  t.deepEqual(TimeMath.addAbsRel(t100, r3), t103);
});

test('timeMath different labels', t => {
  const b1 = makeTimerBrand('fake timer brand 1');
  const b2 = makeTimerBrand('fake timer brand 2');
  const t100 = harden({ timerBrand: b1, absValue: 100n });
  const r3 = harden({ timerBrand: b2, relValue: 3n });
  t.throws(() => TimeMath.addAbsRel(t100, r3), {
    message: /TimerBrands must match: .* vs .*/,
  });
});

test('timeMath one label', t => {
  const timerBrand = makeTimerBrand('fake timer brand');
  const t100 = harden({ timerBrand, absValue: 100n });
  const r3 = harden({ timerBrand, relValue: 3n });
  const t103 = harden({ timerBrand, absValue: 103n });
  t.deepEqual(TimeMath.addAbsRel(t100, 3n), t103);
  t.deepEqual(TimeMath.addAbsRel(100n, r3), t103);
});

test('timeMath no labels', t => {
  t.deepEqual(TimeMath.addAbsRel(100n, 3n), 103n);
});
