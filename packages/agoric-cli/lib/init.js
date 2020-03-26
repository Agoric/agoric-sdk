import parseArgs from 'minimist';
import chalk from 'chalk';

const DEFAULT_DAPP_TEMPLATE = 'dapp-simple-exchange';
const DEFAULT_DAPP_URL_BASE = 'git://github.com/Agoric/';

// Use either an absolute template URL, or find it relative to DAPP_URL_BASE.
const gitURL = (relativeOrAbsoluteURL, base) => {
  const url = new URL(relativeOrAbsoluteURL, base);
  if (url.protocol === 'git:') {
    // Ensure it ends in `.git`.
    return url.href.endsWith('.git') ? url.href : `${url.href}.git`;
  }
  return url.href;
};

export default async function initMain(_progname, rawArgs, priv, _opts) {
  const { anylogger, spawn, fs } = priv;
  const log = anylogger('agoric:init');
  const {
    _: args,
    'dapp-template': dappTemplate,
    'dapp-base': dappBase,
  } = parseArgs(rawArgs, {
    boolean: ['force'],
    default: {
      'dapp-template': DEFAULT_DAPP_TEMPLATE,
      'dapp-base': DEFAULT_DAPP_URL_BASE,
    },
  });

  if (args.length !== 1) {
    return log.error(`you must specify exactly one DIR`);
  }
  const [DIR] = args;

  const dappURL = gitURL(dappTemplate, dappBase);

  // Run the Git commands.
  log.info(`initializing ${DIR} from ${dappURL}`);

  const pspawn = (...psargs) =>
    new Promise((resolve, _reject) => {
      const cp = spawn(...psargs);
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });

  if (
    await pspawn('git', ['clone', '--origin=upstream', dappURL, DIR], {
      stdio: 'inherit',
    })
  ) {
    throw Error('cannot clone');
  }

  await pspawn('rm', ['-rf', '.git'], { cwd: DIR });
  await pspawn('git', ['init'], { cwd: DIR });

  let topLevelName;
  const subdirs = ['', 'api/', 'contract/', 'ui/', '_agstate/agoric-servers/'];
  for (const dir of subdirs) {
    const path = `${DIR}/${dir}package.json`;
    log('rewriting ', path);

    // eslint-disable-next-line no-await-in-loop
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

    // eslint-disable-next-line no-await-in-loop
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
