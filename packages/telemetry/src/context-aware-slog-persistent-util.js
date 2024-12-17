import { readFileSync, writeFileSync } from 'fs';
import { serializeSlogObj } from './serialize-slog-obj.js';

export const DEFAULT_CONTEXT_FILE = 'slog-context.json';
const FILE_ENCODING = 'utf8';

/**
 * @param {string} filePath
 */
const getContextFilePersistenceUtils = filePath => {
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

export default getContextFilePersistenceUtils;
