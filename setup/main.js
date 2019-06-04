import {ACCOUNT_JSON, CHAIN_HOME, playbook, sleep, SSH_TYPE} from './setup';
import {readFile, resolve, stat, streamFromString} from './files';
import {doRun, exec, needDoRun, shellEscape, shellMetaRegexp} from './run';
import doInit from './init';
import {prompt} from 'inquirer';

const main = async (progname, args) => {
  const initHint = () => {
    const adir = process.cwd();
    console.error(`\

NOTE: to manage the ${adir} setup directory, do
  export AG_SETUP_COSMOS_BACKEND=${adir}
or
  cd ${adir}
and run ${progname} subcommands`);
  };
  const help = () => console.log(`\
Usage: ${progname} [command] [...args]

bootstrap   call \`init [...args]' then proceed with automatic setup
help        display this message
init        initialize a chain setup directory
provision   create network nodes to match this setup
run         run a shell command on a set of nodes
play        run an Ansible playbook on the nodes
show-hosts  display the Ansible hosts file for the nodes
`);
  const inited = async (cmd = `${progname} init`, ...files) => {
    files = [...files, 'vars.tf', 'ansible.cfg'];
    try {
      const ps = files.map((path) => stat(path));
      await Promise.all(ps);
    } catch (e) {
      throw `${process.cwd()} does not appear to be a directory created by \`${cmd}'`;
    }
  };
  
  const cmd = args[0];
  if (CHAIN_HOME) {
    // Switch to the chain home.
    switch (cmd) {
      case 'bootstrap':
      case 'init':
      case 'destroy':
      case 'merge-genesis':
        break;
      default:
        process.chdir(CHAIN_HOME);
        break;
    }
  }

  switch (cmd) {
    case 'help': {
      help();
      break;
    }
    case 'bootstrap': {
      let [dir] = args.slice(1);
      const reMain = (args) => {
        const displayArgs = [progname, ...args];
        if (displayArgs.length >= 4 && displayArgs[1] === 'new-account') {
          displayArgs[3] = '*redacted*';
        }
        console.error('$', ...displayArgs.map(shellEscape));
        return main(progname, args);
      };

      await reMain(['init', ...args.slice(1)]);

      const json = await readFile(ACCOUNT_JSON);
      const {user, password} = JSON.parse(String(json));
      await reMain(['new-account', user, password]);
      const {stdout, stderr} = await exec(`ag-cosmos-helper keys show ${shellEscape(user)} -a`);
      if (stderr) {
        console.error(String(stderr));
        return 1;
      }
      const pubkey = String(stdout).trimRight();
      const {CONFIRM} = await prompt([{type: "confirm", name: "CONFIRM", default: false, message: "Have you written the phrase down in a safe place?"}]);
      if (!CONFIRM) {
        throw `You are not responsible enough to run an Agoric Cosmos Chain!`;
      }
  
      await reMain(['provision', '-auto-approve']);
      await needDoRun(['sh', '-c', `${shellEscape(progname)} show-hosts > hosts`]);
      while (true) {
        const code = await reMain(['play', 'update_known_hosts']);
        if (code === 0) {
          break;
        }
        await sleep(10, 'for hosts to boot SSH');
      }
      await reMain(['play', 'bootstrap', `-eBOOTSTRAP_PUBKEY=${pubkey}`]);
      await needDoRun(['sh', '-c', `${shellEscape(progname)} merge-genesis genesis/*/genesis.json > genesis.json`]);
      await reMain(['play', 'install-genesis']);
      await reMain(['install-peers']);
      initHint();
      break;
    }

    case 'new-account': {
      const [user, passwd] = args.slice(1);
      const stdin = passwd ? streamFromString(`${passwd}\n${passwd}\n`) : 'inherit';
      await needDoRun(['ag-cosmos-helper', 'keys', 'add', user], stdin);
      break;
    }

    case 'install-peers': {
      await inited();
      await needDoRun(playbook('install', '-ePERSISTENT_PEERS=hello,world,foobar'));
      break;
    }

    case 'merge-genesis': {
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
        dir = CHAIN_HOME;
      }
      if (!dir) {
        throw `Need: [dir]`;
      }

      // Unprovision terraform.
      let exists;
      try {
        exists = await stat(`${dir}/.terraform`);
      } catch (e) {}
      if (exists) {
        // Terraform will prompt.
        await needDoRun(['sh', '-c', `cd ${shellEscape(dir)} && terraform destroy`]);
      }

      const {CONFIRM} = await prompt([{type: 'input', name: 'CONFIRM', default: 'no', message: `Type "yes" if you are sure you want to remove ${dir}:`}]);
      if (CONFIRM !== 'yes') {
        throw `Aborting due to user request`;
      }
      await needDoRun(['rm', '-rf', dir]);
      break;
    }

    case 'init': {
      await doInit(progname, args);
      initHint();
      break;
    }

    case 'provision': {
      await inited();
      let exists;
      try {
        exists = await stat('.terraform');
      } catch (e) {}

      if (!exists) {
        await needDoRun(['terraform', 'init']);
      }
      await needDoRun(['terraform', 'apply', ...args.slice(1)]);
      break;
    }

    case 'show-hosts': {
      const SSH_PRIVATE_KEY_FILE = resolve(process.cwd(), `id_${SSH_TYPE}`);
      await inited(`${progname} init`, SSH_PRIVATE_KEY_FILE);
      const {stdout, stderr} = await exec(`terraform output -json`);
      if (stderr) {
        console.error(`${stderr}`);
      }
      const obj = JSON.parse(`${stdout}`);
      const out = process.stdout;
      out.write(`\
all:
  children:
`);
      let allHosts = `\
  hosts:
`;
      for (const provider of Object.keys(obj.public_ips.value).sort()) {
        out.write(`\
    ${provider}:
      hosts:
`)
        const ips = obj.public_ips.value[provider];
        const offset = Number(obj.offsets.value[provider]);
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
          const prefixLines = (str, prefix) => {
            const allLines = str.split('\n');
            if (allLines[allLines.length - 1] === '') {
              allLines.pop();
            }
            return allLines.reduce((prior, line) => (prior + prefix + line + '\n'), '');
          };
          const indent = (str, nspaces) => prefixLines(str, ' '.repeat(nspaces));
          allHosts += indent(host, 4);
          out.write(indent(host, 8));
        }
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
      return await doRun(playbook(`${pb}.yml`, ...pbargs));
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
