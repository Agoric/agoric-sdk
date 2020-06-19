import path from 'path';
import chalk from 'chalk';
import { createHash } from 'crypto';
import djson from 'deterministic-json';

const PROVISION_PASSES = '100provisionpass';
const DELEGATE0_STAKE = '100000000uagstake';

const FAKE_CHAIN_DELAY =
  process.env.FAKE_CHAIN_DELAY === undefined
    ? 0
    : Number(process.env.FAKE_CHAIN_DELAY);
const PORT = process.env.PORT || 8000;
const HOST_PORT = process.env.HOST_PORT || PORT;

export default async function startMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, spawn, os, process } = powers;
  const log = anylogger('agoric:start');

  const finishGenesis = async genfile => {
    // Fix up the genesis file.
    log('finishing', genfile);
    const genjson = await fs.readFile(genfile, 'utf-8');
    const genesis = JSON.parse(genjson);

    // Tweak the parameters we need.
    genesis.app_state.auth.params.tx_size_cost_per_byte = '1';
    genesis.app_state.staking.params.bond_denom = 'uagstake';
    genesis.consensus_params.block.time_iota_ms = '1000';

    await fs.writeFile(genfile, JSON.stringify(genesis, undefined, 2));

    // Calculate the GCI and save to disk.
    const ds = djson.stringify(genesis);
    const gci = createHash('sha256')
      .update(ds)
      .digest('hex');
    const hashFile = `${genfile}.sha256`;
    log('writing', hashFile);
    await fs.writeFile(hashFile, gci);
  };

  const pspawnEnv = { ...process.env };
  const pspawn = (
    cmd,
    cargs,
    { stdio = 'inherit', env = pspawnEnv, ...rest } = {},
  ) => {
    log.debug(chalk.blueBright(cmd, ...cargs));
    const cp = spawn(cmd, cargs, { stdio, env, ...rest });
    const pr = new Promise((resolve, _reject) => {
      cp.on('exit', resolve);
      cp.on('error', () => resolve(-1));
    });
    pr.cp = cp;
    return pr;
  };

  let keysSpawn;
  if (opts.sdk) {
    keysSpawn = (args, ...rest) =>
      pspawn('ag-cosmos-helper', [`--home=_agstate/keys`, ...args], ...rest);
  } else {
    keysSpawn = (args, ...rest) =>
      pspawn(
        'docker',
        [
          'run',
          `--volume=${process.cwd()}:/usr/src/dapp`,
          `--rm`,
          `-it`,
          `--entrypoint=ag-cosmos-helper`,
          'agoric/agoric-sdk',
          `--home=/usr/src/dapp/_agstate/keys`,
          ...args,
        ],
        ...rest,
      );
  }

  const capture = (spawner, args) => {
    const capret = [
      spawner(args, { stdio: ['inherit', 'pipe', 'inherit'] }),
      '',
    ];
    capret[0].cp.stdout.on('data', chunk => {
      capret[1] += chunk.toString('utf-8');
    });
    return capret;
  };

  const showKey = keyName =>
    capture(keysSpawn, [
      'keys',
      'show',
      keyName,
      '-a',
      '--keyring-backend=test',
    ]);

  const exists = async file => {
    try {
      await fs.stat(file);
      return true;
    } catch (e) {
      return false;
    }
  };

  let agSolo;
  let agSetupSolo;
  let agServer;
  if (opts.sdk) {
    agSolo = path.resolve(__dirname, '../../cosmic-swingset/bin/ag-solo');
    agSetupSolo = path.resolve(__dirname, '../../cosmic-swingset/setup-solo');
  } else {
    agSolo = `${process.cwd()}/node_modules/@agoric/cosmic-swingset/bin/ag-solo`;
  }

  async function startFakeChain(profileName, _startArgs, popts) {
    const fakeDelay =
      popts.delay === undefined ? FAKE_CHAIN_DELAY : Number(popts.delay);

    if (!opts.sdk) {
      if (
        !(await exists('node_modules/@agoric/cosmic-swingset')) &&
        !(await exists(
          '_agstate/agoric-servers/node_modules/@agoric/cosmic-swingset',
        ))
      ) {
        log.error(`you must first run '${progname} install'`);
        return 1;
      }
    }

    const fakeGCI = 'sim-chain';
    if (!(await exists(agServer))) {
      log(chalk.yellow(`initializing ${profileName}`));
      await pspawn(
        agSolo,
        ['init', profileName, '--egresses=fake', `--webport=${HOST_PORT}`],
        {
          cwd: '_agstate/agoric-servers',
        },
      );
    }

    if (fakeDelay >= 0) {
      log(chalk.yellow(`setting sim chain with ${fakeDelay} second delay`));
      await pspawn(
        agSolo,
        ['set-fake-chain', '--role=two_chain', `--delay=${fakeDelay}`, fakeGCI],
        {
          cwd: agServer,
        },
      );
    }

    if (!popts.restart) {
      // Don't actually run the chain.
      return 0;
    }

    // Translate {inspectBrk: brkOpt} into [`--inspect-brk=${brkOpt}`]
    const debugOpts = [];
    for (const [prop, value] of Object.entries(opts)) {
      if (prop.startsWith('inspect')) {
        const name = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        if (value === true) {
          debugOpts.push(`--${name}`);
        } else {
          debugOpts.push(`--${name}=${value}`);
        }
      }
    }

    const ps = pspawn(agSolo, [...debugOpts, 'start', '--role=two_client'], {
      cwd: agServer,
    });
    process.on('SIGINT', () => ps.cp.kill('SIGINT'));
    return ps;
  }

  async function startLocalChain(profileName, startArgs, popts) {
    const IMAGE = `agoric/agoric-sdk`;

    if (popts.pull) {
      const status = await pspawn('docker', ['pull', IMAGE]);
      if (status) {
        return status;
      }
    }

    let chainSpawn;
    if (popts.sdk) {
      chainSpawn = (args, spawnOpts = undefined) =>
        pspawn('ag-chain-cosmos', [`--home=${agServer}`, ...args], spawnOpts);
    } else {
      chainSpawn = (args, spawnOpts = undefined, dockerArgs = []) =>
        pspawn(
          'docker',
          [
            'run',
            `--volume=${process.cwd()}:/usr/src/dapp`,
            `--rm`,
            ...dockerArgs,
            `-it`,
            IMAGE,
            `--home=/usr/src/dapp/${agServer}`,
            ...args,
          ],
          spawnOpts,
        );
    }

    if (!(await exists(agServer))) {
      const status = await chainSpawn([
        'init',
        'local-chain',
        '--chain-id=agoric',
      ]);
      if (status) {
        return status;
      }
    }

    // Get or create the essential addresses.
    const addrs = {};
    for (const keyName of ['delegate0', 'provision']) {
      /* eslint-disable no-await-in-loop */
      let capret = showKey(keyName);
      if (await capret[0]) {
        const status = await keysSpawn([
          'keys',
          'add',
          keyName,
          '--keyring-backend=test',
        ]);
        if (status) {
          return status;
        }
        capret = showKey(keyName);
        const status2 = await capret[0];
        if (status2) {
          return status2;
        }
      }
      addrs[keyName] = capret[1].trimRight();
      /* eslint-enable no-await-in-loop */
    }

    const genfile = `${agServer}/config/genesis.json`;
    if (!(await exists(`${genfile}.stamp`))) {
      let status;
      await chainSpawn([
        'add-genesis-account',
        addrs.provision,
        PROVISION_PASSES,
      ]);
      if (status) {
        return status;
      }
      await chainSpawn([
        'add-genesis-account',
        addrs.delegate0,
        DELEGATE0_STAKE,
      ]);
      if (status) {
        return status;
      }
      const keysHome = opts.sdk
        ? `_agstate/keys`
        : `/usr/src/dapp/_agstate/keys`;
      status = await chainSpawn([
        'gentx',
        `--home-client=${keysHome}`,
        '--keyring-backend=test',
        '--name=delegate0',
        `--amount=${DELEGATE0_STAKE}`,
      ]);
      if (status) {
        return status;
      }
      status = await chainSpawn(['collect-gentxs']);
      if (status) {
        return status;
      }
      status = await chainSpawn(['validate-genesis']);
      if (status) {
        return status;
      }
      status = await fs.writeFile(`${genfile}.stamp`, Date.now());
      if (status) {
        return status;
      }
    }

    // Complete the genesis file and launch the chain.
    await finishGenesis(genfile);
    return chainSpawn(
      ['start', '--pruning=nothing'],
      {
        env: { ...process.env, ROLE: 'two_chain' },
      },
      // Accessible via either localhost or host.docker.internal
      [`--publish=26657:26657`, `--name=agoric/n0`],
    );
  }

  async function startTestnetDocker(profileName, startArgs, popts) {
    const IMAGE = `agoric/cosmic-swingset-setup-solo`;

    if (popts.pull) {
      const status = await pspawn('docker', ['pull', IMAGE]);
      if (status) {
        return status;
      }
    }

    const setupRun = (...bonusArgs) =>
      pspawn('docker', [
        'run',
        `-p127.0.0.1:${HOST_PORT}:${PORT}`,
        `--volume=${process.cwd()}:/usr/src/dapp`,
        `-eAG_SOLO_BASEDIR=/usr/src/dapp/_agstate/agoric-servers/${profileName}`,
        `--rm`,
        `-it`,
        IMAGE,
        `--webport=${PORT}`,
        `--webhost=0.0.0.0`,
        ...bonusArgs,
        ...startArgs,
      ]);

    if (!(await exists(agServer))) {
      const status = await setupRun('--no-restart');
      if (status) {
        return status;
      }
    }

    return setupRun();
  }

  async function startTestnetSdk(profileName, startArgs) {
    const virtEnv = path.resolve(
      `_agstate/agoric-servers/ve3-${os.platform()}-${os.arch()}`,
    );
    if (!(await exists(`${virtEnv}/bin/pip`))) {
      const status = await pspawn('python3', ['-mvenv', virtEnv], {
        cwd: agSetupSolo,
      });
      if (status) {
        return status;
      }
    }

    const pipRun = (...bonusArgs) =>
      pspawn(`${virtEnv}/bin/pip`, bonusArgs, {
        cwd: agSetupSolo,
      });

    if (!(await exists(`${virtEnv}/bin/wheel`))) {
      const status = await pipRun('install', 'wheel');
      if (status) {
        return status;
      }
    }

    if (!(await exists(`${virtEnv}/bin/ag-setup-solo`))) {
      const status = await pipRun('install', `--editable`, '.');
      if (status) {
        return status;
      }
    }

    const setupRun = (...bonusArgs) =>
      pspawn(
        `${virtEnv}/bin/ag-setup-solo`,
        [`--webport=${PORT}`, ...bonusArgs, ...startArgs],
        {
          env: { ...process.env, AG_SOLO_BASEDIR: agServer },
        },
      );

    if (!(await exists(agServer))) {
      const status = await setupRun('--no-restart');
      if (status) {
        return status;
      }
    }

    return setupRun();
  }

  const profiles = {
    dev: startFakeChain,
    'local-chain': startLocalChain,
    // 'local-solo': opts.sdk ? startLocalSoloSdk : startLocalSoloDocker,
    testnet: opts.sdk ? startTestnetSdk : startTestnetDocker,
  };

  const popts = opts;

  if (popts.verbose > 1) {
    // Enable verbose logs.
    pspawnEnv.DEBUG = 'agoric';
  } else if (!popts.verbose) {
    // Disable more logs.
    pspawnEnv.DEBUG = '';
  }

  const args = rawArgs.slice(1);
  const profileName = args[0] || 'dev';
  const startFn = profiles[profileName];
  if (!startFn) {
    log.error(
      `unrecognized profile name ${profileName}; use one of: ${Object.keys(
        profiles,
      )
        .sort()
        .join(', ')}`,
    );
    return 1;
  }

  agServer = `_agstate/agoric-servers/${profileName}`;

  if (popts.reset) {
    log(chalk.green(`removing ${agServer}`));
    // rm is available on all the unix-likes, so use it for speed.
    await pspawn('rm', ['-rf', agServer]);
  }

  return startFn(profileName, args[0] ? args.slice(1) : args, popts);
}
