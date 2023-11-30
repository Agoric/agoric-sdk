/* global process */
// @ts-check

/** @typedef {import('child_process').ChildProcess} ChildProcess */

export const getSDKBinaries = ({
  jsPfx = '../..',
  goPfx = `${jsPfx}/../golang`,
} = {}) => {
  const myUrl = import.meta.url;
  const cosmosBuild = ['make', '-C', `${goPfx}/cosmos`, 'all'];
  const xsnap = new URL(`${jsPfx}/xsnap`, myUrl).pathname;
  return {
    agSolo: new URL(`${jsPfx}/solo/src/entrypoint.js`, myUrl).pathname,
    agSoloBuild: ['yarn', '--cwd', xsnap, `build:from-env`],
    cosmosChain: new URL(`${goPfx}/cosmos/build/agd`, myUrl).pathname,
    cosmosChainBuild: cosmosBuild,
    cosmosClientBuild: cosmosBuild,
    cosmosHelper: new URL(`${goPfx}/cosmos/build/agd`, myUrl).pathname,
  };
};

/**
 * Create a promisified spawn function with the following built-in parameters.
 *
 * @param {object} param0
 * @param {Record<string, string | undefined>} [param0.env] the default environment
 * @param {*} [param0.chalk] a colorizer
 * @param {Console} [param0.log] a console object
 * @param {import('child_process').spawn} param0.spawn the spawn function
 */
export const makePspawn = ({
  env: defaultEnv = process.env,
  log = console,
  chalk,
  spawn,
}) =>
  /**
   * Promisified spawn.
   *
   * @param {Parameters<import('child_process').spawn>[0]} cmd command name to run
   * @param {Parameters<import('child_process').spawn>[1]} cargs arguments to the command
   * @param {Parameters<import('child_process').spawn>[2]} options
   * @returns {Promise<number> & { childProcess: ChildProcess }}} promise for
   * exit status. The return result has a `childProcess` property to obtain
   * control over the running process
   */
  function pspawn(
    cmd,
    cargs,
    { stdio = 'inherit', env = defaultEnv, ...rest } = {},
  ) {
    const color = (method, ...args) => {
      if (chalk && chalk[method]) {
        return chalk[method](...args);
      }
      return args.join(' ');
    };

    log.warn(color('blueBright', cmd, ...cargs));
    const cp = spawn(cmd, cargs, { stdio, env, ...rest });
    const pr = new Promise((resolve, _reject) => {
      cp.on('exit', resolve);
      cp.on('error', rawError => {
        let reason;
        const e = /** @type {Error & { code: string }} */ (rawError);
        switch (e && e.code) {
          case 'EACCES': {
            reason = 'Access denied';
            break;
          }
          case 'ENOENT': {
            reason = 'File not found';
            break;
          }
          default: {
            reason = e;
          }
        }
        log.error(color('yellow', `cannot execute ${cmd}:`), reason);
        resolve(-1);
      });
    });
    return Object.assign(pr, { childProcess: cp });
  };
