/* eslint-env node */

import { watch, readFileSync } from 'fs';

const FILE_ENCODING = 'utf-8';
const FILE_PATH = process.env.MESSAGE_FILE_PATH;

/**
 * @param {string} filePath
 * @param {string} message
 */
const checkFileContent = (filePath, message) => {
  const fileContent = readFileSync(filePath, FILE_ENCODING).trim();
  if (!new RegExp(message).test(fileContent)) return '';
  return fileContent;
};

/**
 * @param {string} filePath
 */
const watchSharedFile = filePath => {
  const [, , message] = process.argv;

  return /** @type {Promise<string>} */ (
    new Promise((resolve, reject) => {
      /**
       * @type {import('fs').FSWatcher}
       */
      let watcher;

      /**
       * @param {import('fs').WatchEventType} eventType
       */
      const listener = eventType => {
        if (eventType === 'change') {
          const possibleContent = checkFileContent(filePath, message);
          if (possibleContent) {
            watcher.close();
            resolve(possibleContent);
          }
        }
      };

      watcher = watch(filePath, FILE_ENCODING, listener);

      watcher.on('close', () => reject(Error('Watcher closed')));
      watcher.on('error', error => reject(error));

      listener('change');
    })
  );
};

FILE_PATH &&
  watchSharedFile(FILE_PATH).then(
    fileContent => fileContent && console.log(fileContent),
  );
