import parseArgs from 'minimist';
import chalk from 'chalk';

export default async function installMain(progname, rawArgs, priv, opts) {
  const { console, error, spawn } = priv;
  const { _: args } = parseArgs(rawArgs);

  const pspawn = (...args) =>
    new Promise((resolve, reject) => {
      const cp = spawn(...args);
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });

  // Install via Yarn.
  if (!opts.sdk && await pspawn('yarn', ['install'], { stdio: 'inherit'})) {
    error('Cannot yarn install');
    return 1;
  };
  console.log(chalk.bold.green('Done installing'));
}
