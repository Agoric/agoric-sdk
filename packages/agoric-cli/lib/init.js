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
  const { console, error, spawn } = priv;
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
    return error(`you must specify exactly one DIR`);
  }
  const [DIR] = args;

  const dappURL = gitURL(dappTemplate, dappBase);

  // Run the Git commands.
  console.log(`initializing ${DIR} from ${dappURL}`);

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

  if (
    await pspawn('git', ['config', '--unset', 'branch.master.remote'], {
      cwd: DIR,
    })
  ) {
    throw Error('cannot detach from upstream');
  }

  console.log(chalk.bold.yellow(`Done initializing ${DIR}`));
  return 0;
}
