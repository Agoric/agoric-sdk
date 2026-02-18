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
  // XXX `npm query .workspace` is more general but doesn't work with `nodeLinker: pnpm`
  const out = execFileSync('yarn', ['workspaces', 'list', '--json'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: true,
    encoding: 'utf-8',
    cwd: root,
  });
  const jsons = out.split('\n').filter(String); // filter the empty string
  /** @type {Array<{ location: string, name: string, description: string }>} */
  const objs = jsons.map(str => JSON.parse(str));
  return objs.filter(({ location }) => location !== '.');
};
