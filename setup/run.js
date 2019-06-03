import util from 'util';
import {exec as rawExec, spawn} from 'child_process';
export const exec = util.promisify(rawExec);


export const shellMetaRegexp = /(\s|['"\\`$;])/;
export const shellEscape = (arg) => (arg.match(shellMetaRegexp) ? `"${arg.replace(/(["\\])/g, '\\$1')}"` : arg);

// Dah-doo-run-run-run, dah-doo-run-run.
export const doRun = (cmd) => {
  console.error('$', ...cmd.map(shellEscape));
  const proc = spawn(cmd[0], cmd.slice(1), {stdio: [process.stdin, process.stdout, process.stderr]});
  return new Promise((resolve, reject) => {
    proc.once('exit', resolve);
    proc.once('error', reject);
  });
};

export const needDoRun = async (cmd) => {
    const ret = await doRun(cmd);
    if (ret !== 0) {
      throw `Aborted with exit code ${ret}`;
    }
  };
    