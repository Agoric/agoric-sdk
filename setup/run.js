import util from 'util';
import {exec as rawExec, spawn} from 'child_process';
import { Writable } from 'stream';
export const exec = util.promisify(rawExec);

export const shellMetaRegexp = /(\s|[\[\]'"\\`$;*?{}])/;
export const shellEscape = (arg) => (arg.match(shellMetaRegexp) ? `"${arg.replace(/(["\\])/g, '\\$1')}"` : arg);
let SETUP_SILENT = false;
export const setSilent = (val) => {
  SETUP_SILENT = val;
};

export const chdir = (path) => {
  if (!SETUP_SILENT) {
    console.error('$ cd', shellEscape(path));
  }
  return new Promise(resolve => {
    process.chdir(path);
    resolve();
  });
};

// Dah-doo-run-run-run, dah-doo-run-run.
export const doRun = (cmd, readable, writeCb) => {
  if (!SETUP_SILENT) {
    console.error('$', ...cmd.map(shellEscape));
  }
  const stdio = [readable ? 'pipe' : 'inherit', writeCb ? 'pipe' : 'inherit', 'inherit'];
  const proc = spawn(cmd[0], cmd.slice(1), {stdio});
  if (readable) {
    readable.pipe(proc.stdin);
  }
  if (writeCb) {
    const writable = new Writable({
      write(chunk, encoding, callback) {
        try {
          writeCb(chunk, encoding);
        } catch (e) {
          return callback(e);
        }
        callback();
      },
    });
    proc.stdout.pipe(writable);
  }

  return new Promise((resolve, reject) => {
    proc.once('exit', resolve);
    proc.once('error', reject);
  });
};

export const needDoRun = async (cmd, ...opts) => {
    const ret = await doRun(cmd, ...opts);
    if (ret !== 0) {
      throw `Aborted with exit code ${ret}`;
    }
  };
