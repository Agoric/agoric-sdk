import test from 'ava';
import { dataToBase64, base64ToBytes } from '../src/main.js';

test('bytes conversions', t => {
  const insouts = [
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg=='],
    ['fooba', 'Zm9vYmE='],
    ['foobar', 'Zm9vYmFy'],
  ];
  for (const [inp, outp] of insouts) {
    t.is(dataToBase64(inp), outp, `${inp} encodes`);
    t.is(base64ToBytes(outp), inp, `${outp} decodes`);
  }
  const inputs = [
    'a',
    'ab',
    'abc',
    'Hello, world!',
    '\x0d\x02\x09\xff\xfe',
    'other--+iadtedata',
  ];
  for (const str of inputs) {
    t.is(base64ToBytes(dataToBase64(str)), str, `${str} round trips`);
  }
});
