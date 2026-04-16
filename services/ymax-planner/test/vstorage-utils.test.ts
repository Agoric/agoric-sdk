import test from 'ava';
import type { ThrowsExpectation } from 'ava';

import {
  countVstoragePathSegmentsRelativeTo,
  vstoragePathIsAncestorOf,
  vstoragePathIsParentOf,
} from '../src/vstorage-utils.ts';

const invalidPaths: Array<
  [string, ThrowsExpectation<Error>['message'], detail?: string]
> = [
  ['.foo', /starts with/],
  ['bar.', /ends with/],
  ['baz..qux', /doubled/],
  ...Array.from({ length: 256 }, (_, i) => {
    const ch = String.fromCharCode(i);
    if (ch === '.' || /^[a-zA-Z0-9_-]$/.test(ch)) return undefined;
    const label = `U+${i.toString(16).padStart(4, '0')}`;
    return [ch, /contains invalid/, label] as [string, RegExp, string];
  }).filter((x => x) as (x) => x is [string, RegExp, string]),
];

test('countVstoragePathSegmentsRelativeTo', t => {
  t.is(countVstoragePathSegmentsRelativeTo('foo', ''), 1);
  t.is(countVstoragePathSegmentsRelativeTo('', 'foo'), -1);

  t.is(countVstoragePathSegmentsRelativeTo('foo.bar', 'foo'), 1);
  t.is(countVstoragePathSegmentsRelativeTo('foo', 'foo.bar'), -1);

  t.is(countVstoragePathSegmentsRelativeTo('foo.bar.baz', 'foo'), 2);
  t.is(countVstoragePathSegmentsRelativeTo('foo', 'foo.bar.baz'), -2);

  for (const path of ['', 'foo', 'foo.bar', 'foo.bar.baz']) {
    const count = countVstoragePathSegmentsRelativeTo(path, path);
    t.is(count, 0, `is reflexive for ${JSON.stringify(path)}`);
  }

  for (const [path, message, detail] of invalidPaths) {
    let label = `invalid path: ${JSON.stringify(path)}`;
    if (detail) label += ` (${detail})`;
    t.throws(
      () => countVstoragePathSegmentsRelativeTo(path, 'foo'),
      { message },
      label,
    );
    t.throws(
      () => countVstoragePathSegmentsRelativeTo('foo', path),
      { message },
      label,
    );
  }
});

test('vstoragePathIsAncestorOf', t => {
  t.true(vstoragePathIsAncestorOf('', 'foo'));
  t.false(vstoragePathIsAncestorOf('foo', ''));

  t.true(vstoragePathIsAncestorOf('foo', 'foo.bar'));
  t.false(vstoragePathIsAncestorOf('foo.bar', 'foo'));

  t.true(vstoragePathIsAncestorOf('foo.bar', 'foo.bar.baz'));
  t.false(vstoragePathIsAncestorOf('foo.bar.baz', 'foo.bar'));

  t.true(vstoragePathIsAncestorOf('foo', 'foo.bar.baz'));
  t.false(vstoragePathIsAncestorOf('foo.bar.baz', 'foo'));

  for (const path of ['', 'foo', 'foo.bar', 'foo.bar.baz']) {
    t.false(
      vstoragePathIsAncestorOf(path, path),
      `is not reflexive for ${JSON.stringify(path)}`,
    );
  }

  for (const [path, message, detail] of invalidPaths) {
    let label = `invalid path: ${JSON.stringify(path)}`;
    if (detail) label += ` (${detail})`;
    t.throws(() => vstoragePathIsAncestorOf(path, 'foo'), { message }, label);
    t.throws(() => vstoragePathIsAncestorOf('foo', path), { message }, label);
  }
});

test('vstoragePathIsParentOf', t => {
  t.true(vstoragePathIsParentOf('', 'foo'));
  t.false(vstoragePathIsParentOf('foo', ''));

  t.true(vstoragePathIsParentOf('foo', 'foo.bar'));
  t.false(vstoragePathIsParentOf('foo.bar', 'foo'));

  t.true(vstoragePathIsParentOf('foo.bar', 'foo.bar.baz'));
  t.false(vstoragePathIsParentOf('foo.bar.baz', 'foo.bar'));

  t.false(vstoragePathIsParentOf('foo', 'foo.bar.baz'));
  t.false(vstoragePathIsParentOf('foo.bar.baz', 'foo'));

  for (const path of ['', 'foo', 'foo.bar', 'foo.bar.baz']) {
    t.false(
      vstoragePathIsParentOf(path, path),
      `is not reflexive for ${JSON.stringify(path)}`,
    );
  }

  for (const [path, message, detail] of invalidPaths) {
    let label = `invalid path: ${JSON.stringify(path)}`;
    if (detail) label += ` (${detail})`;
    t.throws(() => vstoragePathIsParentOf(path, 'foo'), { message }, label);
    t.throws(() => vstoragePathIsParentOf('foo', path), { message }, label);
  }
});
