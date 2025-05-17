/**
 * Create a `tmpDir` function that synchronously creates a temporary directory
 * and a function for deleting it along with any added contents.
 *
 * @param {Pick<import('tmp'), 'dirSync'>} tmp
 */
export const makeTempDirFactory = tmp => {
  /** @type {(prefix?: string) => [dirName: string, cleanup: () => void]} */
  const tmpDir = prefix => {
    const { name, removeCallback } = tmp.dirSync({
      prefix,
      unsafeCleanup: true,
    });
    return [name, removeCallback];
  };
  return tmpDir;
};
