import { makeTracer } from '@agoric/internal';
import { execFile as execFileAmbient } from 'child_process';
import { promisify } from 'node:util';
import fsp from 'node:fs/promises';

const trace = makeTracer('Runr');

/**
 * @param {Record<string, string | string[] | undefined>} record - e.g. { color: 'blue' }
 * @returns {string[]} - e.g. ['--color', 'blue']
 */
export const flags = record => {
  // TODO? support --yes with boolean?

  /** @type {[string, string][]} */
  // @ts-expect-error undefined is filtered out
  const skipUndef = Object.entries(record).filter(([_k, v]) => v !== undefined);
  return skipUndef.flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.flatMap(v => [`--${key}`, v]);
    }
    return [`--${key}`, value];
  });
};

export const makeRunner = ({
  execFile = execFileAmbient,
  readFile = fsp.readFile,
}) => {
  /**
   * run program using npx to find it
   *
   * @param {string} file
   * @param {string[]} args
   */
  const npx = (file, args) =>
    promisify(execFile)('npx', ['--no-install', file, ...args]);

  const readJSON = f => readFile(f, 'utf-8').then(s => JSON.parse(s));

  /**
   *
   * TODO: thread $HOME
   *
   * @param {string} builder
   * @param {Record<string, string | string[]>} builderOpts
   */
  const runBuilder = async (builder, builderOpts) => {
    const args = ['run', builder, ...(builderOpts ? flags(builderOpts) : [])];
    const { stdout } = await npx('agoric', args);
    const match = stdout.match(/ (?<name>[-\w]+)-permit.json/);
    if (!(match && match.groups)) {
      throw Error('no permit found');
    }
    const plan = await readJSON(`./${match.groups.name}-plan.json`);
    trace(plan);
    return plan;
  };

  return harden({
    npx,
    runBuilder,
  });
};
