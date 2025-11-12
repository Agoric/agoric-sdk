/* eslint-env node */
// @ts-check

/** @import { ChildProcess } from 'child_process' */

// Backwards compatibility
export { fetchEnvNetworkConfig as getNetworkConfig } from '@agoric/client-utils';

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
 * @param {object} args
 * @param {Record<string, string | undefined>} [args.env] the default environment
 * @param {*} [args.chalk] a colorizer
 * @param {Console} [args.log] a console object
 * @param {(cmd: string, cargs: Array<string>, opts: any) => ChildProcess} args.spawn the spawn function
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
   * @param {object} [opts]
   * @param {string} [opts.cwd]
   * @param {string | [string, string, string]} [opts.stdio] standard IO
   * specification
   * @param {Record<string, string | undefined>} [opts.env] environment
   * @param {boolean} [opts.detached] whether the child process should be detached
   * @returns {Promise<number> & { childProcess: ChildProcess }}} promise for
   * exit status. The return result has a `childProcess` property to obtain
   * control over the running process
   */
  function pspawn(
    cmd,
    cargs,
    { stdio = 'inherit', env = defaultEnv, captureStdout = false, ...rest } = {},
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

    const makeStdoutAddons = () => {
      if (!captureStdout) {
        return {};
      }

      const { stdout } = cp;
      assert(stdout);
      const buffer = new ArrayBuffer(1024, {
        maxByteLength: 0x1_00_00_00_00,
      });
      const bytes = new Uint8Array(buffer);
      let byteLength = 0;
      stdout.on('data', chunk => {
        while (byteLength + chunk.byteLength >= buffer.byteLength) {
          buffer.resize(buffer.byteLength * 2);
        }
        bytes.set(chunk, byteLength);
        byteLength += chunk.byteLength;
      });

      const getBytes = () => bytes.subarray(0, byteLength);

      const getText = () => new TextDecoder().decode(getBytes());

      const getJson = () => JSON.parse(getText());

      return {
        text: getText,
        bytes: getBytes,
        json: getJson,
      }
    };

    return Object.assign(pr, {
      childProcess: cp,
      ...makeStdoutAddons()
    });
  };
