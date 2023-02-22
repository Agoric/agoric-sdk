import fs from 'fs';
import { bundlePaths } from './paths.js';

export { supervisorBundleSHA256 } from '../dist/supervisor.bundle.sha256.js';

/**
 *
 * @typedef {{ moduleFormat: string, source: string, sourceMap: [string] }} Bundle
 * @returns { Promise<Bundle> }
 */
export const getSupervisorBundle = async () => {
  const path = bundlePaths.supervisor;
  const bundleStringP = fs.promises.readFile(path, { encoding: 'utf-8' });
  return bundleStringP
    .catch(err => {
      console.error(`supervisor bundle not present at ${path}`);
      console.error(
        `perhaps run 'yarn build' in @agoric/swingset-xsnap-supervisor`,
      );
      throw err;
    })
    .then(bundleString => JSON.parse(bundleString));
};
