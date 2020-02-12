import { test } from 'tape';
import { an, assert, details, openDetail } from '../src/assert';
import { throwsAndLogs } from './throwsAndLogs';

test('an', t => {
  try {
    t.equal(an('object'), 'an object');
    t.equal(an('function'), 'a function');
    // does not treat an initial 'y' as a vowel
    t.equal(an('yaml file'), 'a yaml file');
    // recognize upper case vowels
    t.equal(an('Object'), 'an Object');
    // coerce non-objects to strings.
    // non-letters are treated as non-vowels
    t.equal(an({}), 'a [object Object]');
  } catch (e) {
    console.log('unexpected exception', e);
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// Self-test of the example from the throwsAndLogs comment.
test('throwsAndLogs', t => {
  const err = {};
  try {
    throwsAndLogs(
      t,
      () => {
        console.error('what ', err);
        throw new Error('foo');
      },
      /foo/,
      [['error', 'what ', err]],
    );
  } catch (e) {
    console.log('unexpected exception', e);
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('assert', t => {
  try {
    assert(2 + 3 === 5);
    assert.equal(2 + 3, 5);
    throwsAndLogs(t, () => assert(false), /check failed/, [
      ['log', 'FAILED ASSERTION false'],
      ['error', 'check failed'],
    ]);
    throwsAndLogs(
      t,
      () => assert.equal(5, 6),
      /Expected \(a number\) === \(a number\)/,
      [
        ['log', 'FAILED ASSERTION false'],
        ['error', 'Expected ', 5, ' === ', 6, ''],
      ],
    );
    throwsAndLogs(t, () => assert.equal(5, 6, 'foo'), /foo/, [
      ['log', 'FAILED ASSERTION false'],
      ['error', 'Assertion failed: foo'],
    ]);
    throwsAndLogs(
      t,
      () => assert.equal(5, 6, details`${5} !== ${6}`),
      /\(a number\) !== \(a number\)/,
      [
        ['log', 'FAILED ASSERTION false'],
        ['error', '', 5, ' !== ', 6, ''],
      ],
    );
    throwsAndLogs(
      t,
      () => assert.equal(5, 6, details`${5} !== ${openDetail(6)}`),
      /\(a number\) !== 6/,
      [
        ['log', 'FAILED ASSERTION false'],
        ['error', '', 5, ' !== ', 6, ''],
      ],
    );
  } catch (e) {
    console.log('unexpected exception', e);
    t.assert(false, e);
  } finally {
    t.end();
  }
});
