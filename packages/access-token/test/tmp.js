import tmp from 'tmp';

/**
 * @param {string} [prefix]
 * @returns {[string, () => void]}
 */
export const tmpDir = prefix => {
  const { name, removeCallback } = tmp.dirSync({ prefix, unsafeCleanup: true });
  return [name, removeCallback];
};
