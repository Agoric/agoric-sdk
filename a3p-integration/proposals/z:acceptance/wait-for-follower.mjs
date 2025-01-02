/* eslint-env node */

import { readFile, watch } from 'fs/promises';

const FILE_ENCODING = 'utf-8';
const FILE_PATH = process.env.MESSAGE_FILE_PATH;

/**
 * @param {string} filePath
 */
const watchSharedFile = async filePath => {
  console.log('Starting waiting for follower signal, current file contents: ', (await readFile(filePath, FILE_ENCODING));
  for await (const { eventType } of watch(filePath)) {
    if (eventType === 'change') {
      const fileContent = (await readFile(filePath, FILE_ENCODING)).trim();
      const parsed = /^stopped at ([0-9]+)$/.exec(fileContent);
      if (!parsed)
        console.warn('Ignoring unsupported file content: ', fileContent);
      else return Number(parsed[1]);
    }
  }
  return 0;
};

FILE_PATH &&
  watchSharedFile(FILE_PATH).then(height =>
    console.log(`Follower stopped at height ${height}`),
  );
