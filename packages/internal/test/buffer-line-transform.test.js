import test from 'ava';
import BufferLineTransform from '../src/node/buffer-line-transform.js';
import { fromString } from '../src/uint8array-utils.js';

test('BufferLineTransform basic functionality', t => {
  const transform = new BufferLineTransform();
  const results = [];
  
  transform.on('data', data => {
    results.push(data);
  });
  
  // Test simple line breaking on newline (byte 10)
  const input = fromString('line1\nline2\nline3');
  transform.write(input);
  transform.end();
  
  t.is(results.length, 3);
  // Results should be Uint8Arrays or Buffers (stream converts)
  const decoder = new TextDecoder();
  t.is(decoder.decode(results[0]).replace(/\n$/, ''), 'line1');
  t.is(decoder.decode(results[1]).replace(/\n$/, ''), 'line2');
  t.is(decoder.decode(results[2]), 'line3');
});

test('BufferLineTransform custom break character', t => {
  const transform = new BufferLineTransform({ break: 44 }); // comma
  const results = [];
  
  transform.on('data', data => {
    results.push(data);
  });
  
  const input = fromString('item1,item2,item3');
  transform.write(input);
  transform.end();
  
  t.is(results.length, 3);
  const decoder = new TextDecoder();
  t.is(decoder.decode(results[0]).replace(/,$/, ''), 'item1');
  t.is(decoder.decode(results[1]).replace(/,$/, ''), 'item2');
  t.is(decoder.decode(results[2]), 'item3');
});

test('BufferLineTransform string break value', t => {
  const transform = new BufferLineTransform({ break: '\r\n' });
  const results = [];
  
  transform.on('data', data => {
    results.push(data);
  });
  
  const input = fromString('line1\r\nline2\r\nline3');
  transform.write(input);
  transform.end();
  
  t.is(results.length, 3);
  const decoder = new TextDecoder();
  t.is(decoder.decode(results[0]).replace(/\r\n$/, ''), 'line1');
  t.is(decoder.decode(results[1]).replace(/\r\n$/, ''), 'line2');
  t.is(decoder.decode(results[2]), 'line3');
});

test('BufferLineTransform empty input', t => {
  const transform = new BufferLineTransform();
  const results = [];
  
  transform.on('data', data => {
    results.push(data);
  });
  
  transform.end();
  
  t.is(results.length, 0);
});

test('BufferLineTransform chunked input', t => {
  const transform = new BufferLineTransform();
  const results = [];
  
  transform.on('data', data => {
    results.push(data);
  });
  
  // Write input in chunks to test buffering
  transform.write(fromString('line1\nli'));
  transform.write(fromString('ne2\nline3'));
  transform.end();
  
  t.is(results.length, 3);
  const decoder = new TextDecoder();
  t.is(decoder.decode(results[0]).replace(/\n$/, ''), 'line1');
  t.is(decoder.decode(results[1]).replace(/\n$/, ''), 'line2');
  t.is(decoder.decode(results[2]), 'line3');
});