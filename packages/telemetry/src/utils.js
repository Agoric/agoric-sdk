import { readFileSync, writeFileSync } from 'node:fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import { serializeSlogObj } from '@agoric/telemetry/src/serialize-slog-obj.js';

const FILE_ENCODING = 'utf8';

/**
 * @param {string} filePath
 */
export const getContextFilePersistenceUtils = filePath => {
  console.warn(`Using file ${filePath} for slogger context`);

  return {
    /**
     * @param {import('./context-aware-slog.js').Context} context
     */
    persistContext: context => {
      try {
        writeFileSync(filePath, serializeSlogObj(context), FILE_ENCODING);
      } catch (err) {
        console.error('Error writing context to file: ', err);
      }
    },

    /**
     * @returns {import('./context-aware-slog.js').Context | null}
     */
    restoreContext: () => {
      try {
        return JSON.parse(readFileSync(filePath, FILE_ENCODING));
      } catch (parseErr) {
        console.error('Error reading context from file: ', parseErr);
        return null;
      }
    },
  };
};
