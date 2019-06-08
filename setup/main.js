import {SETUP_HOME, DEFAULT_BOOT_TOKENS, playbook, sleep, SSH_TYPE} from './setup';
import {exists, readFile, resolve, stat, streamFromString, createFile, unlink} from './files';
import {chdir, doRun, needBacktick, needDoRun, shellEscape, shellMetaRegexp, setSilent} from './run';
import doInit from './init';

import inquirer from 'inquirer';
import djson from 'deterministic-json';
import crypto from 'crypto';
import chalk from 'chalk';
import parseArgs from 'minimist';
import { mkdir } from 'fs';

const PROVISION_DIR = 'provision';
const COSMOS_DIR = 'ag-chain-cosmos';
const CONTROLLER_DIR = 'ag-pserver';

const provisionOutput = async () => {
  const jsonFile = `${PROVISION_DIR}/terraform.json`;
  let json;
  if (await exists(jsonFile)) {
    json = String(await readFile(jsonFile));
  } else {
    json = await needBacktick(`terraform output -json`);
    await createFile(jsonFile, json);
  }
  return JSON.parse(json);
};

const main = async (progname, rawArgs) => {
  const {_: args, ...opts} = parseArgs(rawArgs);
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
      let [bootAddress] = args.slice(1);
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

      if (!await exists(PROVISION_DIR)) {
        await mkdir(PROVISION_DIR);
      }
      const hostsFile = `${PROVISION_DIR}/hosts`;
      if (!await exists(hostsFile)) {
        await needReMain(['provision', '-auto-approve']);
        const hosts = await needBacktick(`${shellEscape(progname)} show-hosts`);
        await createFile(hostsFile, hosts);
      }

      const knownHostsStamp = `${PROVISION_DIR}/ssh_known_hosts.stamp`;
      if (!await exists(knownHostsStamp)) {
        while (true) {
          const code = await reMain(['play', 'update_known_hosts']);
          if (code === 0) {
            break;
          } else if (code !== 2) {
            return code;
          }
          await sleep(10, 'for hosts to boot SSH');
        }
        await createFile(knownHostsStamp, String(new Date));
      }

      // Prepare all the machines.
      const machineFile = `${PROVISION_DIR}/prepare.stamp`;
      if (!await exists(machineFile)) {
        await needReMain(['play', 'prepare-machine']);
        await createFile(machineFile, String(new Date));
      }
      
      // Initialize the controller.
      if (!await exists(CONTROLLER_DIR)) {
        await mkdir(CONTROLLER_DIR);
      }
      const conFile = `${CONTROLLER_DIR}/data/bootstrap-address.txt`;
      if (!await exists(conFile)) {
        await needReMain(['play', 'prepare-controller']);
        await createFile(conFile, String(new Date));
      }

      // Bootstrap the chain nodes.
      const genesisFile = `${COSMOS_DIR}/data/genesis.json`;
      if (!await exists(genesisFile)) {
        await needReMain(['play', 'prepare-cosmos', `-eBOOTSTRAP_ADDRESS=${bootAddress}`, `-eBOOTSTRAP_TOKENS=${bootTokens}`]);
        const merged = await needBacktick(`${shellEscape(progname)} show-genesis ${COSMOS_DIR}/data/*/genesis.json`);
        await createFile(genesisFile, merged);
      }

      const installCosmosStamp = `${COSMOS_DIR}/install.stamp`;
      if (!await exists(installCosmosStamp)) {
        await needReMain(['play', 'install-cosmos']);
        await createFile(installCosmosStamp, String(new Date));
      }

      const peersFile = `${COSMOS_DIR}/peers.txt`;
      let peers;
      if (await exists(peersFile)) {
        peers = await readFile(peersFile);
      } else {
        peers = await needBacktick(`${progname} show-peers`);
        await createFile(peersFile, peers);
      }

      const installPeersStamp = `${COSMOS_DIR}/peers.stamp`;
      if (!await exists(installPeersStamp)) {
        await needReMain(['play', 'install', `-ePERSISTENT_PEERS=${peers}`]);
        await createFile(installPeersStamp, String(new Date));
      }

      const startStamp = `${COSMOS_DIR}/start.stamp`;
      if (!await exists(startStamp)) {
        await needReMain(['play', 'start']);
        await createFile(startStamp, String(new Date));
      }

      await needReMain(['wait-for-any']);
      console.error(chalk.black.bgGreenBright.bold('Your Agoric Cosmos chain is now running!'));

      const cfg = await needBacktick(`${progname} show-config`);
      process.stdout.write(chalk.yellow(cfg));



      initHint();
      break;
    }

    case 'show-chain-name': {
      await inited();
      const chainName = await readFile(`${COSMOS_DIR}/ag-chain-cosmos-network.txt`);
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
      out.write(`\
all:
  children:
`);
      let allHosts = `\
  hosts:
`;
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
        byGroup[name] = indent(beginBlock, 4);
        return (block) => byGroup[name] += indent(block, 8);
      };

      const addChainCosmos = makeGroup('ag-chain-cosmos');
      make
      for (const provider of Object.keys(prov.public_ips.value).sort()) {
        const addProvider = makeGroup(provider);
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
          allHosts += indent(host, 4);
          addProvider(host);

          // TODO: Don't make these hardcoded assumptions.
          // For now, we add all the nodes to ag-chain-cosmos, and the first node to ag-pserver.
          addChainCosmos(host);
          if (node === 'node0') {
            makeGroup('ag-pserver')(host);
          }
        }
      }
      for (const group of Object.keys(byGroup).sort()) {
        out.write(group);
      }
      out.write(allHosts);
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
