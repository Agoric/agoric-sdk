// @ts-nocheck
import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';

const test = anyTest as TestFn<SetupContextWithWallets>;

function repeatedCall(fn, interval) {
  const id = setInterval(fn, interval);
  return () => {
    clearInterval(id);
  };
}

function fetchData(url, uiElement) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () => {
      if (xhr.status === 200) {
        uiElement.innerHTML = xhr.responseText;
        resolve(xhr.responseText);
      } else {
        reject(xhr.statusText);
      }
    };
    xhr.onerror = () => {
      reject(xhr.statusText);
    };
    xhr.send();
  });
}

const url = 'http://127.0.0.1:1317';
const uiElement = '<h2>hi</h2>';
test('repeatedCall clears interval on callback', async t => {
  const clearFn = repeatedCall(() => fetchData(url, uiElement), 1000);
  await t.notThrows(() => clearFn());
});

test('repeatedCall calls function at specified interval', async t => {
  let calls = 0;
  const clearFn = repeatedCall(() => {
    calls++;
  }, 1000);
  setTimeout(() => {
    t.is(calls, 5);
    clearFn();
  }, 5000);
});

test('repeatedCall handles multiple concurrent calls', async t => {
  const numCalls = 40;
  const clearFn = repeatedCall(() => fetchData(url, uiElement), 500);
  setTimeout(() => {
    clearFn();
  }, numCalls * 500);
  await t.notThrows(() => clearFn());
});
