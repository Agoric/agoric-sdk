import { exec as rawExec, spawn } from 'child_process';
import { Writable } from 'stream';

export const shellMetaRegexp = /(\s|[\[\]'"\\`$;*?{}])/;
export const shellEscape = arg =>
  arg.match(shellMetaRegexp) ? `"${arg.replace(/(["\\])/g, '\\$1')}"` : arg;
let SETUP_SILENT = false;
export const setSilent = val => {
  SETUP_SILENT = val;
};

export const exec = cmd => {
  const cp = rawExec(cmd);
  const promise = new Promise((resolve, reject) => {
    cp.addListener('error', reject);
    cp.addListener('exit', code => {
      resolve(code);
    });
  });
  promise.process = cp;
  return promise;
};

export const getStdout = async cmd => {
  const cp = exec(cmd);
  let outbuf = '';
  const stdout = new Writable({
    write(data, encoding, callback) {
      outbuf += String(data);
      callback();
    },
  });
  cp.process.stdout.pipe(stdout);
  cp.process.stderr.pipe(process.stderr);

  const code = await cp;
  return { stdout: outbuf, code };
};

export const backtick = async cmd => {
  const ret = await getStdout(cmd);
  return ret.stdout;
};

export const needBacktick = async cmd => {
  const ret = await getStdout(cmd);
  if (ret.code !== 0) {
    throw `Unexpected ${JSON.stringify(cmd)} exit code: ${ret.code}`;
  }
  return ret.stdout;
};

export const chdir = path => {
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
  const stdio = [
    readable ? 'pipe' : 'inherit',
    writeCb ? 'pipe' : 'inherit',
    'inherit',
  ];
  const proc = spawn(cmd[0], cmd.slice(1), { stdio });
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
  return ret;
};
