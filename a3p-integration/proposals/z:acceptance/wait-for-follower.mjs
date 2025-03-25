/* eslint-env node */

import { readFile } from 'fs/promises';
import { watch } from 'fs';

const FILE_ENCODING = 'utf-8';
const FILE_PATH = process.env.MESSAGE_FILE_PATH;

/**
 * @param {string} filePath
 * @param {string} message
 */
const checkFileContent = async (filePath, message) => {
  const fileContent = (await readFile(filePath, FILE_ENCODING)).trim();
  if (!new RegExp(message).test(fileContent)) return '';
  return fileContent;
};

/**
 * @template T
 * @returns {{promise: Promise<T>; reject: (reason: Error) => void; resolve: (value: T) => void; }}
 */
const createDeferredPromise = () => {
  /**
   * @type {(value: T) => void}
   */
  let resolve = _ => {};
  /**
   * @type {(reason: Error) => void}
   */
  let reject = _ => {};

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

/**
 * @param {string} filePath
 */
async function* createFileWatcher(filePath) {
  let { promise, resolve, reject } = createDeferredPromise();
  let closed = false;

  const watcher = watch(filePath, FILE_ENCODING, (eventType, fileName) =>
    resolve({ eventType, fileName }),
  );

  watcher.addListener('close', () => (closed = true));

  watcher.on('error', error => reject(error));

  try {
    yield /** @type {import('node:fs/promises').FileChangeInfo<string>} */ ({
      eventType: 'change',
      filename: filePath,
    });
    while (!closed) {
      yield await promise;
      ({ promise, resolve, reject } = createDeferredPromise());
    }
  } finally {
    watcher.close();
  }
}

/**
 * @param {string} filePath
 */
const watchSharedFile = async filePath => {
  const [, , message] = process.argv;

  for await (const { eventType } of createFileWatcher(filePath)) {
    if (eventType === 'change') {
      const possibleContent = await checkFileContent(filePath, message);
      if (possibleContent) return possibleContent;
    }
  }

  return undefined;
};

FILE_PATH &&
  watchSharedFile(FILE_PATH).then(
    fileContent => fileContent && console.log(fileContent),
  );
