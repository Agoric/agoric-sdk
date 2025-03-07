// @ts-check

/**
 * @import { execFileSync } from 'child_process';
 */

/**
 * Omits the root
 *
 * @param {{ execFileSync: execFileSync }} io
 * @returns {Array<{ location: string, name: string }>}
 */
export const listWorkspaces = ({ execFileSync }) => {
  const out = execFileSync('npm', ['query', '.workspace'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: true,
    encoding: 'utf-8',
  });
  /** @type {Array<{ location: string, name: string, description: string }>} */
  const result = JSON.parse(out);
  return result.filter(({ location }) => location !== '.');
};
