import chalk from 'chalk';
import { makePspawn } from './helpers.js';

// Use either an absolute template URL, or find it relative to DAPP_URL_BASE.
const gitURL = (relativeOrAbsoluteURL, base) => {
  const url = new URL(relativeOrAbsoluteURL, base);
  if (url.protocol === 'git:') {
    // Ensure it ends in `.git`.
    return url.href.endsWith('.git') ? url.href : `${url.href}.git`;
  }
  return url.href;
};

export default async function initMain(_progname, rawArgs, priv, opts) {
  const { anylogger, spawn, fs } = priv;
  const log = anylogger('agoric:init');

  const args = rawArgs.slice(1);

  if (args.length !== 1) {
    return log.error(`you must specify exactly one DIR`);
  }
  const [DIR] = args;

  const dappURL = gitURL(opts.dappTemplate, opts.dappBase);

  // Run the Git commands.
  log.info(`initializing ${DIR} from ${dappURL}`);

  const pspawn = makePspawn({ log, chalk, spawn });

  let dappBranch = [];
  if (opts.dappBranch) {
    dappBranch = ['-b', opts.dappBranch];
  }

  const shallow = ['--depth', '1', '--shallow-submodules'];
  const exitStatus = await pspawn(
    'git',
    ['clone', '--origin=upstream', ...shallow, dappURL, DIR, ...dappBranch],
    {
      stdio: 'inherit',
    },
  );
  if (exitStatus) {
    throw Error('cannot clone');
  }

  await pspawn('rm', ['-rf', '.git'], { cwd: DIR });
  await pspawn('git', ['init'], { cwd: DIR });

  let topLevelName;
  const subdirs = ['', 'api/', 'contract/', 'ui/', '_agstate/agoric-servers/'];
  for await (const dir of subdirs) {
    const path = `${DIR}/${dir}package.json`;
    log('rewriting ', path);

    const contents = await fs.readFile(path, 'utf-8');
    const pkg = JSON.parse(contents.replace(/@DIR@/g, DIR));
    if (dir === '') {
      topLevelName = pkg.name;
    }
    if (!pkg.name || !pkg.name.startsWith(topLevelName)) {
      throw Error(
        `${path}: "name" must start with ${JSON.stringify(topLevelName)}`,
      );
    }
    pkg.name = `${DIR}${pkg.name.substr(topLevelName.length)}`;
    const json = JSON.stringify(pkg, undefined, 2);

    await fs.writeFile(path, json);
  }

  await pspawn('git', ['add', '.'], { cwd: DIR });
  await pspawn(
    'git',
    ['commit', '-m', `chore: agoric init ${DIR}\n\nImported from ${dappURL}`],
    {
      cwd: DIR,
    },
  );

  log.info(chalk.bold.yellow(`Done initializing ${DIR}`));
  return 0;
}
