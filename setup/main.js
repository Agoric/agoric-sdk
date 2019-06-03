import util from 'util';
import {resolve, basename} from 'path';
import {exec as rawExec, spawn} from 'child_process';
import {statSync} from 'fs';
import {createInterface} from 'readline';
const exec = util.promisify(rawExec);

const SETUP_DIR = resolve(__dirname, '../setup');
const SSH_TYPE = 'ecdsa';
const CHAIN_HOME = process.env.AG_SETUP_COSMOS_HOME || process.cwd();

const shellMetaRegexp = /(\s|['"\\`$;])/;
const shellEscape = (arg) => (arg.match(shellMetaRegexp) ? `"${arg.replace(/(["\\])/g, '\\$1')}"` : arg);

// Dah-doo-run-run-run, dah-doo-run-run.
const doRun = (cmd) => {
  console.error('$', ...cmd.map(shellEscape));
  const proc = spawn(cmd[0], cmd.slice(1), {stdio: [process.stdin, process.stdout, process.stderr]});
  return new Promise((resolve, reject) => {
    proc.once('exit', resolve);
    proc.once('error', reject);
  });
};

const needNotExists = async (filename) => {
  let exists;
  try {
    exists = statSync(filename);
  } catch (e) {}
  if (exists) {
    throw `${filename} already exists`;
  }
};

const needDoRun = async (cmd) => {
  const ret = await doRun(cmd);
  if (ret !== 0) {
    throw `Aborted with exit code ${ret}`;
  }
};

const playbook = (name) => {
  const fullPath = `${SETUP_DIR}/ansible/${name}`;
  return ['ansible-playbook', `-essh_known_hosts=${process.cwd()}/ssh_known_hosts`, fullPath];
};

const sleep = (seconds, why) => {
  console.error(`Waiting ${seconds} seconds`, why || '');
  return new Promise((resolve, reject) => setInterval(resolve, 1000 * seconds));
}

const ask = (prompt) => {
  const rl = createInterface(process.stdin, process.stdout);
  return new Promise((resolve) => {
    rl.question(prompt, (result) => {
      rl.close();
      resolve(result);
    });
  });
}

const main = async (progname, args) => {
  const initHint = (dir) => console.error(`\

NOTE: to manage the ${dir} setup directory, do
  export AG_SETUP_COSMOS_BACKEND=${dir}
or
  cd ${dir}
and run ${progname} subcommands`);
  const help = () => console.log(`\
Usage: ${progname} [command] [...args]

bootstrap   call \`init [...args]' then proceed with setup
help        display this message
init        initialize a chain setup directory
provision   create network nodes to match this setup
run         run a shell command on a set of hosts
show-hosts  display the Ansible hosts file for the nodes
update-ssh  download the SSH host keys for the nodes
`);
  const inited = async (cmd = `${progname} init`, ...files) => {
    files = [...files, 'ansible.cfg', 'vars.tf', 'outputs.tf'];
    try {
      const ps = files.map(statSync);
      await Promise.all(ps);
    } catch (e) {
      throw `You need to be in a directory created by \`${cmd}'`;
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
      if (!dir) {
        dir = CHAIN_HOME;
      }
      process.chdir(dir);
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
      initHint(dir);
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
        exists = statSync(`${dir}/.terraform`);
      } catch (e) {}
      if (exists) {
        // Terraform will prompt.
        await needDoRun(['sh', '-c', `cd ${shellEscape(dir)} && terraform destroy`]);
      } else {
        const res = await ask(`Are you sure you want to destroy ${dir}?  Type "yes" to destroy: `);
        if (res !== 'yes') {
          throw `Aborting due to user request`;
        }
      }

      await needDoRun(['rm', '-rf', dir]);
      break;
    }

    case 'init': {
      let [dir, NETWORK_NAME] = args.slice(1);
      if (!dir) {
        dir = CHAIN_HOME;
      }
      if (!dir) {
        throw `Need: [dir] [[network name]]`;
      }
      await needNotExists(dir);

      let subs = '', subSep = '';
      const doSub = (vname, value) => {
        subs += `${subSep}s!@${vname}@!${value}!g`;
        subSep = '; ';
      };

      const adir = resolve(process.cwd(), dir);
      const SSH_PRIVATE_KEY_FILE = resolve(adir, `id_${SSH_TYPE}`);
      const BACKEND_TF = process.env.AG_SETUP_COSMOS_BACKEND;
      if (!NETWORK_NAME) {
        NETWORK_NAME = basename(dir);
      }
      doSub('PWD', adir);
      doSub('SETUP_DIR', SETUP_DIR);
      doSub('NETWORK_NAME', NETWORK_NAME);
      doSub('SSH_KEY_FILE', `${SSH_PRIVATE_KEY_FILE}.pub`);

      // TODO: Gather information and persist so they can change it before commit.
      doSub('DO_API_TOKEN', process.env.DO_API_TOKEN);

      // Check one more time.
      await needNotExists(dir);

      // TODO: Do this all within Node so it works on Windows.
      await needDoRun(['cp', '-a', `${SETUP_DIR}/template`, dir]);
      if (BACKEND_TF) {
        await needDoRun(['sh', '-c',
          `sed -e 's!@WORKSPACE_NAME@!ag-chain-cosmos-${NETWORK_NAME}!g' ${shellEscape(BACKEND_TF)} > ${shellEscape(`${dir}/backend.tf`)}`]);
      }
      // Set empty password.
      await needDoRun(['ssh-keygen', '-N', '', '-t', SSH_TYPE, '-f', SSH_PRIVATE_KEY_FILE])
      const ext = (process.platform === 'darwin') ? ' ""' : '';
      await needDoRun(['sh', '-c',
        `find ${shellEscape(dir)} -type f -print0 | xargs -0 sed -i${ext} -e '${subs}'`]);
      initHint(dir);
      break;
    }

    case 'provision': {
      await inited();
      let exists;
      try {
        exists = statSync('.terraform');
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
      const run = ['ansible', host, '-a', runArg, '-f5'];
      await needDoRun(run);
      break;
    }

    default:
      throw `Unknown command ${cmd}; try \`${progname} help'`;
  }
  return 0;
};

export default main;
