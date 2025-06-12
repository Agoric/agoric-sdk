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
       * @type {Error}
       */
      let error;

      /**
       * @param {import('fs').WatchEventType} eventType
       */
      const listener = eventType => {
        try {
          if (eventType === 'change') {
            const possibleContent = checkFileContent(filePath, message);
            if (possibleContent) {
              watcher.close();
              resolve(possibleContent);
            }
          }
        } catch (err) {
          watcher.close();
          error = err;
        }
      };

      watcher = watch(filePath, FILE_ENCODING, listener);

      watcher.on('close', () => reject(error ?? Error('Watcher closed')));
      watcher.on('error', err => reject(err));

      listener('change');
    })
  );
};

FILE_PATH &&
  watchSharedFile(FILE_PATH).then(
    fileContent => fileContent && console.log(fileContent),
  );
