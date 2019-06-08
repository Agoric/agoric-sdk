import {SETUP_HOME, DEFAULT_BOOT_TOKENS, playbook, sleep, SSH_TYPE} from './setup';
import {dirname, exists, readFile, resolve, stat, streamFromString, createFile, mkdir, unlink} from './files';
import {chdir, doRun, needBacktick, needDoRun, shellEscape, shellMetaRegexp, setSilent} from './run';
import doInit from './init';

import inquirer from 'inquirer';
import djson from 'deterministic-json';
import crypto from 'crypto';
import chalk from 'chalk';
import parseArgs from 'minimist';
import { writeFile } from 'fs';

const PROVISION_DIR = 'provision';
const COSMOS_DIR = 'ag-chain-cosmos';
const CONTROLLER_DIR = 'ag-pserver';

const guardFile = async (file, maker) => {
  if (await exists(file)) {
    return 0;
  }
  const parent = dirname(file);
  if (!await exists(parent)) {
    await mkdir(parent);
  }
  let made = false;
  const ret = await maker(async contents => {
    await createFile(file, contents === undefined ? String(new Date) : contents);
    made = true;
  });
  if (!made) {
    // They failed.
    throw ret;
  }
  return ret;
};

const provisionOutput = async () => {
  const jsonFile = `${PROVISION_DIR}/terraform.json`;
  await guardFile(jsonFile, async makeFile => {
    const json = await needBacktick(`terraform output -json`);
    await makeFile(json);    
  });
  const json = String(await readFile(jsonFile));
  return JSON.parse(json);
};

const main = async (progname, rawArgs) => {
  const {_: args, ...opts} = parseArgs(rawArgs, {
    boolean: ['version', 'help'],
    stopEarly: true,
  });
  const initHint = () => {
    const adir = process.cwd();
    console.error(`\

NOTE: to manage the ${adir} setup directory, do
  export AG_SETUP_COSMOS_HOME=${adir}
or
  cd ${adir}
and run ${progname} subcommands`);
  };
  const help = () => console.log(`\
Usage: ${progname} [command] [...args]

Notable commands:

bootstrap        automatic setup (idempotent)
destroy          unprovision a setup, so that it can be bootstrapped again
help             display this message
init             initialize a chain setup directory
provision        create network nodes to match this setup
run              run a shell command on a set of nodes
play             run an Ansible playbook on the nodes
rolling-restart  restart each node one at a time
show-config      display the client connection parameters
`);
  const inited = async (cmd = `${progname} init`, ...files) => {
    files = [...files, 'ansible.cfg', 'vars.tf'];
    try {
      const ps = files.map((path) => stat(path));
      await Promise.all(ps);
    } catch (e) {
      throw `${process.cwd()} does not appear to be a directory created by \`${cmd}'`;
    }
  };
  
  const cmd = args[0];
  if (SETUP_HOME) {
    // Switch to the chain home.
    switch (cmd) {
      case 'bootstrap':
      case 'init':
      case 'destroy':
      case 'show-genesis':
      case 'show-config':
        break;
      default:
        if (process.cwd() !== SETUP_HOME) {
          await chdir(SETUP_HOME);
        }
        break;
    }
  }

  if (opts.help) {
    help();
    return 0;
  }

  switch (cmd) {
    case 'help': {
      help();
      break;
    }
    case 'bootstrap': {
      const bootTokens = DEFAULT_BOOT_TOKENS;
      const reMain = async (args) => {
        const displayArgs = [progname, ...args];
        console.error('$', ...displayArgs.map(shellEscape));
        return main(progname, args);
      };

      const needReMain = async (args) => {
        const code = await reMain(args);
        if (code !== 0) {
          throw `Unexpected exit: ${code}`;
        }
      };

      const dir = SETUP_HOME;
      if (await exists(`${dir}/network.txt`)) {
        // Change to directory.
        await chdir(dir);
      } else {
        // NOTE: init automatically changes directory.
        await needReMain(['init', dir, ...(process.env.AG_SETUP_COSMOS_NAME ? [process.env.AG_SETUP_COSMOS_NAME] : [])]);
      }

      await guardFile(`${PROVISION_DIR}/hosts`, async makeFile => {
        await needReMain(['provision', '-auto-approve']);
        const hosts = await needBacktick(`${shellEscape(progname)} show-hosts`);
        await makeFile(hosts);
      });

      await guardFile(`${PROVISION_DIR}/ssh_known_hosts.stamp`, async makeFile => {
        while (true) {
          const code = await reMain(['play', 'update_known_hosts']);
          if (code === 0) {
            break;
          } else if (code !== 2) {
            return code;
          }
          await sleep(10, 'for hosts to boot SSH');
        }
        makeFile();
      });

      // Prepare all the machines.
      await guardFile(`${PROVISION_DIR}/prepare.stamp`, async makeFile => {
        await needReMain(['play', 'prepare-machine']);
        await makeFile();
      });
      
      // Initialize the controller.
      await guardFile(`${CONTROLLER_DIR}/prepare.stamp`, async makeFile => {
        await needReMain(['play', 'prepare-controller']);
        await makeFile();
      });

      // Fetch the boot address.
      const bootAddress = String(await readFile(`${CONTROLLER_DIR}/data/node0/boot-address.txt`));

      // Bump the chain name.
      await guardFile(`${COSMOS_DIR}/chain-name.txt`, async makeFile => {
        const instanceFile = `chain-instance.txt`;
        if (!await exists(instanceFile)) {
          chainInstance = 0;
        } else {
          chainInstance = Number(await readFile(instanceFile));
        }
        chainInstance ++;
        const networkName = await readFile('network.txt');
        await writeFile(instanceFile, String(chainInstance));
        await makeFile(`${networkName}${chainInstance}`);
      });

      // Bootstrap the chain nodes.
      const genesisFile = `${COSMOS_DIR}/data/genesis.json`;
      await guardFile(genesisFile, async makeFile => {
        await needReMain(['play', 'prepare-cosmos', `-eBOOTSTRAP_ADDRESS=${bootAddress}`, `-eBOOTSTRAP_TOKENS=${bootTokens}`]);
        const merged = await needBacktick(`${shellEscape(progname)} show-genesis ${COSMOS_DIR}/data/*/genesis.json`);
        await makeFile(merged);
      });

      const peersFile = `${COSMOS_DIR}/peers.txt`;
      await guardFile(peersFile, async makeFile => {
        const peers = await needBacktick(`${progname} show-peers`);
        await makeFile(peers);
      })
      const peers = await readFile(peersFile);

      await guardFile(`${COSMOS_DIR}/install.stamp`, async makeFile => {
        await needReMain(['play', 'install-cosmos', `-ePERSISTENT_PEERS=${peers}`]);
        await makeFile();
      });

      await guardFile(`${COSMOS_DIR}/service.stamp`, async makeFile => {
        await needReMain(['play', 'install']);
        await makeFile();
      });

      await guardFile(`${COSMOS_DIR}/start.stamp`, async makeFile => {
        await needReMain(['play', 'start']);
        await makeFile();
      });

      await needReMain(['wait-for-any']);
      console.error(chalk.black.bgGreenBright.bold('Your Agoric Cosmos chain is now running!'));
      process.stdout.write(chalk.yellow(cfg));

      await guardFile(`${CONTROLLER_DIR}/data/cosmos-chain.json`, async makeFile => {
        const cfg = await needBacktick(`${progname} show-config`);
        await makeFile(cfg);
      });

      await guardFile(`${CONTROLLER_DIR}/install.stamp`, async makeFile => {
        await needReMain(['play', 'install-controller']);
        await makeFile();
      });

      await guardFile(`${CONTROLLER_DIR}/service.stamp`, async makeFile => {
        await needReMain(['play', 'install', '-eservice=ag-pserver', '-eexecline=/usr/src/app/ve3/bin/ag-pserver']);
        await makeFile();
      });

      await guardFile(`${CONTROLLER_DIR}/start.stamp`, async makeFile => {
        await needReMain(['play', 'start', '-eservice=ag-pserver']);
        await makeFile();
      });

      initHint();
      break;
    }

    case 'show-chain-name': {
      await inited();
      const chainName = await readFile(`${COSMOS_DIR}/chain-name.txt`);
      process.stdout.write(chainName);
      break;
    }

    case 'show-bootstrap-address': {
      await inited();
      const bootAddress = await readFile(`${COSMOS_DIR}/account-address.txt`);
      process.stdout.write(bootAddress);
      break;
    }

    case 'show-config': {
      setSilent(true);
      await chdir(SETUP_HOME);
      await inited();
      const [chainName, gci, rpcAddrs, bootstrapAddress] = await Promise.all(
        ['show-chain-name', 'show-gci', 'show-rpcaddrs', 'show-bootstrap-address']
          .map((cmd) => needBacktick([progname, cmd].map(shellEscape).join(' '))));
      const obj = {
        chainName,
        gci,
        rpcAddrs: rpcAddrs.split(','),
        bootstrapAddress,
      };
      process.stdout.write(`${JSON.stringify(obj, undefined, 2)}\n`);
      break;
    }

    case 'rolling-restart': {
      let [...hosts] = args.slice(1);
      await inited();

      if (hosts.length === 0) {
        hosts = ['all'];
      }

      // Expand the hosts into nodes.
      const nodeMap = {};
      for (const host of hosts) {
        const hostLines = await needBacktick(`ansible --list-hosts ${shellEscape(host)}`);
        for (const line of hostLines.split('\n')) {
          const match = line.match(/^\s*(node\d+)/);
          if (match) {
            nodeMap[match[1]] = true;
          }
        }
      }

      const nodes = Object.keys(nodeMap).sort();
      if (nodes.length === 0) {
        throw `Need at least one node`;
      }

      for (const node of nodes) {
        const nodePlaybook = (book, ...args) => playbook(book, '-l', node, ...args);
        await needDoRun(nodePlaybook('restart'));
        await needDoRun([progname, 'wait-for-any', node]);
      }
      break;
    }

    case 'wait-for-any': {
      let [host] = args.slice(1);
      await inited();
      if (!host) {
        host = 'all';
      }

      // Detect when blocks are being produced.
      let height = 0;
      while (true) {
        await sleep(6, `to check if ${chalk.underline(host)} has committed a block`);
        let buf = '';
        const code = await needDoRun(playbook('status', '-l', host), undefined, function(chunk) {
          process.stdout.write(chunk);
          buf += String(chunk);
        });
        const match = buf.match(/Committed state.*module=state.*height=([1-9]\d*)/);
        if (match) {
          height = match[1];
          break;
        }
      }

      const atLeast = host.match(/^node\d+/) ? '' : `At least one of `;
      console.error(chalk.greenBright(`${atLeast}${chalk.underline(host)} is up-and-running (committed block height=${height})`));
      break;
    }

    case 'new-account': {
      const [user, passwd] = args.slice(1);
      const stdin = passwd ? streamFromString(`${passwd}\n${passwd}\n`) : 'inherit';
      await needDoRun(['ag-cosmos-helper', 'keys', 'add', user], stdin);
      break;
    }

    case 'show-rpcaddrs': {
      await inited();
      const prov = await provisionOutput();

      let rpcaddrs = '', sep = '';
      for (const CLUSTER of Object.keys(prov.public_ips.value)) {
        const ips = prov.public_ips.value[CLUSTER];
        const PORT = 26657;
        for (const IP of ips) {
          rpcaddrs += `${sep}${IP}:${PORT}`;
          sep = ',';
        }
      }

      process.stdout.write(rpcaddrs);
      break;
    }

    case 'show-peers': {
      await inited();
      const prov = await provisionOutput();
      const public_ips = [], public_ports = [];
      for (const CLUSTER of Object.keys(prov.public_ips.value)) {
        const ips = prov.public_ips.value[CLUSTER];
        const offset = Number(prov.offsets.value[CLUSTER]);
        for (let i = 0; i < ips.length; i ++) {
          public_ips[offset + i] = ips[i];
        }
      }

      const DEFAULT_PORT = 26656;

      let peers = '', sep = '';
      let idPath;
      let i = 0;
      while (true) {
        // Read the node-id file for this node.
        idPath = `${COSMOS_DIR}/genesis/node${i}/node-id`;
        if (!await exists(idPath)) {
          break;
        }

        const raw = await readFile(idPath);
        const ID = String(raw);

        if (!ID) {
          throw `${idPath} does not contain a node ID`;
        }
        if (!ID.match(/^[a-f0-9]+/)) {
          throw `${idPath} contains an invalid ID ${ID}`;
        }
        const IP = public_ips[i];
        if (!IP) {
          throw `${idPath} does not correspond to a Terraform public IP`;
        }
        const PORT = public_ports[i] || DEFAULT_PORT;
        peers += `${sep}${ID}@${IP}:${PORT}`;
        sep = ',';
        i ++;
      }
      if (i === 0) {
        throw `No ${idPath} file found`;
      }
      process.stdout.write(peers);
      break;
    }

    case 'show-gci': {
      const genesis = await readFile(`${GENESIS}/genesis.json`);
      const s = djson.stringify(JSON.parse(String(genesis)));
      const gci = crypto.createHash('sha256').update(s).digest('hex');
      process.stdout.write(gci);
      break;
    }

    case 'show-genesis': {
      const files = args.slice(1);
      const ps = files.map((file) => readFile(file));
      const bodies = await Promise.all(ps);
      let first;
      const validators = [];
      for (const body of bodies) {
        const text = String(body);
        const obj = JSON.parse(text);
        if (!first) {
          first = obj;
        }
        validators.push(...obj.validators);
      }
      first.validators = validators;
      process.stdout.write(JSON.stringify(first, undefined, 2));
      break;
    }

    case 'destroy': {
      let [dir] = args.slice(1);
      if (!dir) {
        dir = SETUP_HOME;
      }
      if (!dir) {
        throw `Need: [dir]`;
      }

      // Unprovision terraform.
      await chdir(dir);

      if (await exists(`.terraform`)) {
        // Terraform will prompt.
        await needDoRun(['terraform', 'destroy']);
      } else {
        const {CONFIRM} = await inquirer.prompt([{type: 'input', name: 'CONFIRM', default: 'no', message: `Type "yes" if you are sure you want to reset ${dir} state:`}]);
        if (CONFIRM !== 'yes') {
          throw `Aborting due to user request`;
        }
      }

      // Unlink all the state that was built up after terraforming.
      await Promise.all(AFTER_TERRAFORMING.map((name) => unlink(name).catch(e => {})));

      // We no longer are provisioned or have Cosmos.
      await needDoRun(['rm', '-rf', PROVISION_DIR, COSMOS_DIR]);
      break;
    }

    case 'init': {
      await doInit(progname, args);
      initHint();
      break;
    }

    case 'provision': {
      await inited();
      if (!await exists('.terraform')) {
        await needDoRun(['terraform', 'init']);
      }
      await needDoRun(['terraform', 'apply', ...args.slice(1)]);
      break;
    }

    case 'show-hosts': {
      const SSH_PRIVATE_KEY_FILE = resolve(`id_${SSH_TYPE}`);
      await inited(`${progname} init`, SSH_PRIVATE_KEY_FILE);
      const prov = await provisionOutput();
      const out = process.stdout;
      const prefixLines = (str, prefix) => {
        const allLines = str.split('\n');
        if (allLines[allLines.length - 1] === '') {
          allLines.pop();
        }
        return allLines.reduce((prior, line) => (prior + prefix + line + '\n'), '');
      };
      const indent = (str, nspaces) => prefixLines(str, ' '.repeat(nspaces));

      const byGroup = {};
      const makeGroup = (name) => {
        const beginBlock = `\
${name}:
  hosts:
`
        byGroup[name] = beginBlock;
        return (hostBlock) => byGroup[name] += indent(hostBlock, 4);
      };

      const addAll = makeGroup('all')
      const addChainCosmos = makeGroup('ag-chain-cosmos', 4);
      for (const provider of Object.keys(prov.public_ips.value).sort()) {
        const addProvider = makeGroup(provider, 4);
        const ips = prov.public_ips.value[provider];
        const offset = Number(prov.offsets.value[provider]);
        for (let instance = 0; instance < ips.length; instance ++) {
          const ip = ips[instance];
          const node = `node${offset + instance}`
          const host = `\
${node}:
  ansible_host: ${ip}
  ansible_ssh_user: root
  ansible_ssh_private_key_file: '${SSH_PRIVATE_KEY_FILE}'
  ansible_python_interpreter: /usr/bin/python
`;
          addProvider(host);

          // TODO: Don't make these hardcoded assumptions.
          // For now, we add all the nodes to ag-chain-cosmos, and the first node to ag-pserver.
          addChainCosmos(host);
          if (node === 'node0') {
            makeGroup('ag-pserver', 4)(host);
          }
        }
      }
      out.write(byGroup.all);
      out.write('  children:\n');
      for (const group of Object.keys(byGroup).sort()) {
        if (group === 'all') {
          continue;
        }
        out.write(indent(byGroup[group], 4));
      }
      break;
    }

    case 'play': {
      const [pb, ...pbargs] = args.slice(1);
      if (!pb) {
        throw `Need: [playbook name]`;
      }
      if (!pb.match(/^\w[-\w]*$/)) {
        throw `[playbook] ${JSON.stringify(pb)} must be a word`;
      }
      await inited();
      return await doRun(playbook(pb, ...pbargs));
    }

    case 'run': {
      const [host, ...cmd] = args.slice(1);
      if (!host || cmd.length === 0) {
        throw `Need: [host] [cmd...]`;
      }
      await inited();
      let runArg;
      if (cmd.length === 1) {
        if (cmd[0].match(shellMetaRegexp)) {
          // Already contains metacharacters.
          runArg = `sh -c ${shellEscape(cmd[0])}`;
        } else {
          runArg = cmd[0];
        }
      } else {
        // Need to escape each argument individually.
        const escapedArgs = cmd.map(shellEscape);
        runArg = `sh -c ${shellEscape(escapedArgs.join(' '))}`;
      }
      const run = ['ansible', '-f10', host, '-a', runArg];
      await needDoRun(run);
      break;
    }

    default:
      throw `Unknown command ${cmd}; try \`${progname} help'`;
  }
  return 0;
};

export default main;
