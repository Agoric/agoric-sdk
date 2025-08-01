// freeze() rather than harden() to stay with ZERO dependencies.
// expected to be compatible with HardenedJS / ses.
// XXX what hazards does this expose us to?
const { freeze } = Object;

/**
 * @typedef {Record<string, string | undefined>} Environment
 */

/**
 * Access to run a command with flags appended.
 *
 * @example
 * const execP = promisify(childProcess.execFile);
 * const lsPlain = makeCmdRunner('ls', { execFile: execP });
 * const ls = ls.withFlags('-F')
 * await ls.exec('/tmp') // runs: ls /tmp -F
 *
 * TODO? .withPath('/opt') or .withEnv({PATH: `${env.PATH}:/opt`})
 *
 * XXX use a different name from execFile since the meaning is different
 * @param {string} file
 * @param {{ execFile?: any, defaultEnv?: Environment }} [io] XXX expects promisify
 */
export const makeCmdRunner = (file, { execFile, defaultEnv } = {}) => {
  /**
   * @param {{
   *   preArgs: string[],
   *   postArgs: string[],
   *   postEnv: Environment }} opts
   */
  const make = ({ preArgs, postArgs, postEnv }) => {
    return freeze({
      /**
       * @param {string[]} args
       * @param {object} [opts]
       * @param {Record<string, string | undefined>} [opts.env]
       * @param {string} [opts.encoding]
       * @param {*} [opts.stdio]
       */
      exec: (
        args,
        {
          env = { ...defaultEnv },
          encoding = 'utf8',
          stdio = ['ignore', 'pipe', 'ignore'],
          ...opts
        } = {},
      ) =>
        execFile(file, [...preArgs, ...args, ...postArgs], {
          ...opts,
          env: { ...env, ...postEnv },
          encoding,
          stdio,
        }),
      /**
       * @param {string} name
       * @param {string[]} [opts]
       */
      subCommand: (name, opts = []) =>
        make({ preArgs: [...preArgs, name, ...opts], postArgs, postEnv }),
      /**
       * @param {string[]} args
       */
      withArgs: (...args) =>
        make({ preArgs: [...preArgs, ...args], postArgs, postEnv }),
      /**
       * @param {Environment} env
       */
      withEnv: env =>
        make({ preArgs, postArgs, postEnv: { ...env, ...postEnv } }),
      /**
       *
       */
      /** @param {string[]} tailFlags */
      withFlags: (...tailFlags) =>
        make({ preArgs, postArgs: [...postArgs, ...tailFlags], postEnv }),
    });
  };
  return make({ preArgs: [], postArgs: [], postEnv: {} });
};
freeze(makeCmdRunner);
/** @typedef {ReturnType<makeCmdRunner>} CmdRunner */
