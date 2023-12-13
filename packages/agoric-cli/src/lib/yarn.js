// @ts-check
import { execFileSync } from 'child_process';

/**
 * Omits the root
 *
 * @returns {Array<{ location: string, name: string }>}
 */
export const listWorkspaces = () => {
  const ndjson = execFileSync('yarn', ['workspaces', 'list', '--json'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: true,
    encoding: 'utf-8',
  });
  return ndjson
    .trim()
    .split('\n')
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        throw new Error(`Could not parse '${line}'`);
      }
    })
    .filter(({ location }) => location !== '.');
};
