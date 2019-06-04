import {ask, CHAIN_HOME, playbook, sleep, SSH_TYPE} from './setup';
import {resolve, stat} from './files';
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
run         run a shell command on a set of hosts
show-hosts  display the Ansible hosts file for the nodes
update-ssh  download the SSH host keys for the nodes
`);
  const inited = async (cmd = `${progname} init`, ...files) => {
    files = [...files, 'vars.tf', 'ansible.cfg'];
    try {
      const ps = files.map(stat);
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
        console.error('$', ...[progname, ...args].map(shellEscape));
        return main(progname, args);
      };
      await reMain(['init', ...args.slice(1)]);
      await reMain(['provision', '-auto-approve']);
      await needDoRun(['sh', '-c', `${shellEscape(progname)} show-hosts > hosts`]);
      while (true) {
        const code = await reMain(['update-ssh']);
        if (code === 0) {
          break;
        }
        await sleep(10, 'for hosts to boot SSH');
      }
      await reMain(['run', 'all', 'hostname']);
      initHint();
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

    case 'update-ssh': {
      await inited();
      return await doRun(playbook('update_known_hosts.yml'));
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
