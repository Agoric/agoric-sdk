import test from 'ava';
import { makeFileRd, makeFileRW } from '../src/file.js';

test('makeFileRd returns frozen object', t => {
  const fileRd = makeFileRd('/tmp');
  t.true(Object.isFrozen(fileRd), 'FileRd object should be frozen');
});

test('makeFileRW returns frozen object', t => {
  const fileRW = makeFileRW('/tmp');
  t.true(Object.isFrozen(fileRW), 'FileRW object should be frozen');
});

test('makeFileRd joined objects are frozen', t => {
  const fileRd = makeFileRd('/tmp');
  const joined = fileRd.join('subdir');
  t.true(Object.isFrozen(joined), 'Joined FileRd object should be frozen');
});

test('makeFileRW joined objects are frozen', t => {
  const fileRW = makeFileRW('/tmp');
  const joined = fileRW.join('subdir');
  t.true(Object.isFrozen(joined), 'Joined FileRW object should be frozen');
});

test('makeFileRW readOnly returns frozen object', t => {
  const fileRW = makeFileRW('/tmp');
  const readOnly = fileRW.readOnly();
  t.true(Object.isFrozen(readOnly), 'ReadOnly object should be frozen');
});
