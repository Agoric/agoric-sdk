/* eslint-env node */

import { readFile, watch } from 'fs/promises';

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
 * @param {string} filePath
 */
const watchSharedFile = async filePath => {
  const [, , message] = process.argv;

  for await (const { eventType } of wrappedWatch(filePath)) {
    if (eventType === 'change') {
      const possibleContent = await checkFileContent(filePath, message);
      if (possibleContent) return possibleContent;
    }
  }

  return undefined;
};

/**
 * @param {string} filePath
 */
async function* wrappedWatch(filePath) {
  const watchIter = watch(filePath);

  yield /** @type {import('node:fs/promises').FileChangeInfo<string>} */ ({
    eventType: 'change',
    filename: filePath,
  });
  yield* watchIter;
}

FILE_PATH &&
  watchSharedFile(FILE_PATH).then(
    fileContent => fileContent && console.log(fileContent),
  );
