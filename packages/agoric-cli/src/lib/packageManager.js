// @ts-check

/**
 * @import { execFileSync } from 'child_process';
 */

/**
 * Omits the root
 *
 * @param {{ execFileSync: execFileSync }} io
 * @param {string} [root]
 * @returns {Array<{ location: string, name: string }>}
 */
export const listWorkspaces = ({ execFileSync }, root) => {
  const out = execFileSync('npm', ['query', '.workspace'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: true,
    encoding: 'utf-8',
    cwd: root,
  });
  /** @type {Array<{ location: string, name: string, description: string }>} */
  const result = JSON.parse(out);
  return result.filter(({ location }) => location !== '.');
};
