import parseArgs from 'minimist';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { resolve } from 'any-promise';

export default async function installMain(progname, rawArgs, priv) {
  const { console, error } = priv;
  const {
    _: args,
  } = parseArgs(rawArgs);

  let uiPackager = 'npm';
  try {
    await fs.stat('ui/yarn.lock');
    uiPackager = 'yarn';
  } catch (e) {}

  const pspawn = (...args) => new Promise((resolve, reject) => {
    const cp = spawn(...args);
    cp.on('exit', resolve);
    cp.on('error', () => resolve(-1));
  });
  const ret = await pspawn('nogo', ['version']);
  
  const goCmd = ret === 0 && pspawn('npm', ['install'], { cwd: '.agservers', stdio: 'inherit' });

  const children = await Promise.all([
    pspawn(uiPackager, ['install'], { cwd: 'ui', stdio: 'inherit' }),
    pspawn('npm', ['install'], { cwd: 'api', stdio: 'inherit' }),
    pspawn('npm', ['install'], { cwd: 'contract', stdio: 'inherit' }),
    goCmd,
  ]);

  if (!goCmd) {
    console.log(chalk.bold.yellow(`To run Agoric locally you will need to install Go and rerun '${progname} install'`));
  }
  console.log(chalk.bold.green('Done installing'));
}
