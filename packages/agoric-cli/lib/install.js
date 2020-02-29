import parseArgs from 'minimist';
import path from 'path';
import chalk from 'chalk';

export default async function installMain(progname, rawArgs, priv, opts) {
  const { console, error, fs, spawn } = priv;
  const { _: _args } = parseArgs(rawArgs);

  const pspawn = (...args) =>
    new Promise((resolve, _reject) => {
      const cp = spawn(...args);
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });

  // Remove node_modules if it's a symlink.
  try {
    await fs.unlink('node_modules');
  } catch (e) {
    // nothing
  }

  if (opts.sdk) {
    const sdkNodeModules = path.resolve(__dirname, '../../../node_modules');
    await Promise.all(
      ['.agservers', 'contract', 'api'].sort().map(subdir => {
        const nm = `${subdir}/node_modules`;
        console.log(chalk.bold.green(`link SDK ${nm}`));
        return fs
          .unlink(nm)
          .catch(_ => {})
          .then(fs.symlink(sdkNodeModules, nm));
      }),
    );
  } else if (await pspawn('yarn', ['install'], { stdio: 'inherit' })) {
    // Try to install via Yarn.
    error('Cannot yarn install');
    return 1;
  }
  console.log(chalk.bold.green('Done installing'));
  return 0;
}
