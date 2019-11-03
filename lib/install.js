import parseArgs from 'minimist';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

export default async function installMain(progname, rawArgs, priv) {
  const { console, error } = priv;
  const {
    _: args,
  } = parseArgs(rawArgs);

  const pspawn = (...args) => new Promise((resolve, reject) => {
    const cp = spawn(...args);
    cp.on('exit', resolve);
    cp.on('error', () => resolve(-1));
  });

  const spawnOutput = (cmd, args = [], opts = {}) => new Promise((resolve, reject) => {
    let buf = '';
    const cp = spawn(cmd, args, { ...opts, stdio: ['inherit', 'pipe', 'inherit' ] });
    cp.stdout.on('data', chunk => buf += String(chunk));
    cp.on('exit', () => resolve(buf));
    cp.on('error', () => resolve(buf));
  });

  // Install Yarn.
  const yarn = `${__dirname}/../node_modules/.bin/yarn`;
  const pmRet = await pspawn(yarn, ['--version']);
  const pm = pmRet === 0 ? yarn : 'npm';

  // Check for golang version 1.12+.
  const goVsn = await spawnOutput('go', ['version']);
  const match = goVsn.match(/^go version go1\.(\d+)\./);
  const goCmd = match && Number(match[1]) >= 12 &&
    pspawn('npm', ['install'], { cwd: '.agservers', stdio: 'inherit' });

  const iRets = await Promise.all([
    // pspawn(pm, ['install'], { cwd: 'ui', stdio: 'inherit' }),
    pspawn(pm, ['install'], { cwd: 'api', stdio: 'inherit' }),
    pspawn(pm, ['install'], { cwd: 'contract', stdio: 'inherit' }),
    goCmd,
  ]);

  if (!goCmd) {
    console.log(chalk.bold.yellow(`To run Agoric locally you will need to install Go 1.12+ and rerun '${progname} install'`));
  }
  console.log(chalk.bold.green('Done installing'));
}
