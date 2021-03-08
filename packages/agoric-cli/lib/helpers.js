/* global process */
// @ts-check

/** @typedef {import('child_process').ChildProcess} ChildProcess */

/**
 * Create a promisified spawn function with the following built-in parameters.
 *
 * @param {Object} param0
 * @param {Record<string, string>} [param0.env] the default environment
 * @param {*} [param0.chalk] a colorizer
 * @param {Console} [param0.log] a console object
 * @param {(cmd: string, cargs: Array<string>, opts: any) => ChildProcess}param0.spawn the spawn function
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
   * @param {string} cmd command name to run
   * @param {Array<string>} cargs arguments to the command
   * @param {Object} param2
   * @param {string | [string, string, string]} [param2.stdio] standard IO
   * specification
   * @param {Record<string, string>} [param2.env] environment
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

    log.log(color('blueBright', cmd, ...cargs));
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
