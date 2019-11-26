import parseArgs from 'minimist';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

export default async function startMain(progname, rawArgs, priv) {
  const { console, error } = priv;
  const {
    reset,
    _: args,
  } = parseArgs(rawArgs, {
    boolean: ['reset'],
  });

  const pspawn = (...args) => new Promise((resolve, reject) => {
    const cp = spawn(...args);
    cp.on('exit', resolve);
    cp.on('error', () => resolve(-1));
  });

  const exists = async file => {
    try {
      await fs.stat(file);
      return true;
    } catch (e) {
      return false;
    }
  };

  if (!await exists('.agservers/node_modules')) {
    return error(`you must first run '${progname} install' with Go 1.12 or later`);
  }

  if (reset) {
    console.log(chalk.green('removing .agservers/solo'));
    await pspawn('rm', ['-rf', '.agservers/solo'], { stdio: 'inherit' });
  }

  // Run scenario3.
  const css = 'node_modules/\@agoric/cosmic-swingset';
  if (!await exists('.agservers/solo')) {
    console.log(chalk.yellow('initializing solo'))
    await pspawn(`${css}/bin/ag-solo`, ['init', 'solo', '--egresses=none'], {
      stdio: 'inherit',
      cwd: '.agservers',
    });
  }

  console.log(chalk.green('linking html directories'));
  const dappHtml = '.agservers/solo/dapp-html';
  const htmlWallet = '.agservers/solo/html/wallet'; 
  // await Promise.all([fs.unlink(dappHtml).catch(() => {}), fs.unlink(htmlWallet).catch(() => {})]);
  await Promise.all([fs.symlink('../../ui/build', dappHtml).catch(() => {}), 
    fs.symlink('../../../.agwallet', htmlWallet).catch(() => {})]);

  await pspawn(`../${css}/bin/ag-solo`, ['start', '--role=three_client'], {
    stdio: 'inherit',
    cwd: '.agservers/solo',
  });
}
