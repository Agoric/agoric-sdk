import fetch from 'node-fetch';
import inquirer from 'inquirer';
import { SETUP_HOME, PLAYBOOK_WRAPPER, SETUP_DIR, SSH_TYPE } from './setup';
import {
  basename,
  chmod,
  createFile,
  mkdir,
  needNotExists,
  resolve,
} from './files';
import { chdir, needDoRun, shellEscape } from './run';

const tfStringify = obj => {
  let ret = '';
  if (Array.isArray(obj)) {
    let sep = '[';
    for (const el of obj) {
      ret += sep + tfStringify(el);
      sep = ',';
    }
    ret += ']';
  } else if (Object(obj) === obj) {
    let sep = '{';
    for (const key of Object.keys(obj).sort()) {
      ret += `${sep}${JSON.stringify(key)}=${tfStringify(obj[key])}`;
      sep = ',';
    }
    ret += '}';
  } else {
    ret = JSON.stringify(obj);
  }
  return ret;
};

const genericAskApiKey = async (provider, myDetails) => {
  const questions = [
    {
      name: 'API_KEYS',
      type: 'input',
      message: `API Key for ${provider.name}?`,
      default: myDetails.API_KEYS || process.env.DO_API_TOKEN,
      filter: key => key.trim(),
    },
  ];
  const ret = await inquirer.prompt(questions);
  if (!ret.API_KEYS) {
    return { CANCEL: true };
  }
  return ret;
};

const genericAskDatacenter = async (provider, PLACEMENT, dcs, placement) => {
  const questions = [];
  const count = nodeCount(calculateTotal(placement), true);
  const DONE = { name: `Done with ${PLACEMENT} placement${count}`, value: '' };
  if (dcs) {
    questions.push({
      name: 'DATACENTER',
      type: 'list',
      message: `Which ${PLACEMENT} datacenter${count}?`,
      choices: [DONE, ...dcs],
    });
  } else {
    questions.push({
      name: 'DATACENTER',
      type: 'input',
      message: `Which ${PLACEMENT} datacenter${count}?`,
      filter: dc => dc.trim(),
    });
  }

  const { DATACENTER } = await inquirer.prompt(questions);
  if (!DATACENTER) {
    return { MORE: false };
  }

  const { NUM_NODES } = await inquirer.prompt([
    {
      name: 'NUM_NODES',
      type: 'number',
      message: `Number of nodes for ${PLACEMENT} ${DATACENTER} (0 or more)?`,
      default: placement[DATACENTER] || 0,
      validate: num => Math.floor(num) === num && num >= 0,
    },
  ]);
  return { DATACENTER, NUM_NODES, MORE: true };
};

const DOCKER_DATACENTER = 'default';

const PROVIDERS = {
  docker: {
    name: 'Docker instances',
    value: 'docker',
    askDetails: async (_provider, _myDetails) => {
      let vspec = '/sys/fs/cgroup:/sys/fs/cgroup';
      if (process.env.DOCKER_VOLUMES) {
        vspec += `,${process.env.DOCKER_VOLUMES}`;
      }
      return {
        VOLUMES: vspec
          .split(',')
          .map(vol => vol.split(':'))
          // eslint-disable-next-line camelcase
          .map(([host_path, container_path]) => ({
            host_path,
            container_path,
          })),
      };
    },
    askDatacenter: async (provider, PLACEMENT, dcs, placement) => {
      const { NUM_NODES } = await inquirer.prompt([
        {
          name: 'NUM_NODES',
          type: 'number',
          message: `Number of nodes for ${PLACEMENT} (0 or more)?`,
          default: placement[DOCKER_DATACENTER] || 0,
          validate: num => Math.floor(num) === num && num >= 0,
        },
      ]);
      return {
        DATACENTER: DOCKER_DATACENTER,
        NUM_NODES,
        MORE: false,
      };
    },
    createPlacementFiles: (provider, PLACEMENT, PREFIX) =>
      createFile(
        `placement-${PLACEMENT}.tf`,
        `\
module "${PLACEMENT}" {
    source           = "${SETUP_DIR}/terraform/${provider.value}"
    CLUSTER_NAME     = "${PREFIX}\${var.NETWORK_NAME}-${PLACEMENT}"
    OFFSET           = "\${var.OFFSETS["${PLACEMENT}"]}"
    SSH_KEY_FILE     = "\${var.SSH_KEY_FILE}"
    SERVERS          = "\${length(var.DATACENTERS["${PLACEMENT}"])}"
    VOLUMES          = "\${var.VOLUMES["${PLACEMENT}"]}"
}
`,
      ),
  },
  digitalocean: {
    name: 'DigitalOcean https://cloud.digitalocean.com/',
    value: 'digitalocean',
    askDetails: genericAskApiKey,
    askDatacenter: genericAskDatacenter,
    datacenters: async (provider, PLACEMENT, DETAILS) => {
      const { API_KEYS: apikey } = DETAILS;
      const res = await fetch('https://api.digitalocean.com/v2/regions', {
        headers: { Authorization: `Bearer ${apikey}` },
      });
      const json = await res.json();
      if (!json.regions) {
        console.error(`Cannot retrieve digitalocean regions:`, json);
        return;
      }
      return json.regions.map(r => {
        return {
          name: `${r.slug} - ${r.name}`,
          value: r.slug,
        };
      });
    },
    createPlacementFiles: (provider, PLACEMENT, PREFIX) =>
      createFile(
        `placement-${PLACEMENT}.tf`,
        `\
module "${PLACEMENT}" {
    source           = "${SETUP_DIR}/terraform/${provider.value}"
    CLUSTER_NAME     = "${PREFIX}\${var.NETWORK_NAME}-${PLACEMENT}"
    OFFSET           = "\${var.OFFSETS["${PLACEMENT}"]}"
    REGIONS          = "\${var.DATACENTERS["${PLACEMENT}"]}"
    SSH_KEY_FILE     = "\${var.SSH_KEY_FILE}"
    DO_API_TOKEN     = "\${var.API_KEYS["${PLACEMENT}"]}"
    SERVERS          = "\${length(var.DATACENTERS["${PLACEMENT}"])}"
}
`,
      ),
  },
};

const calculateTotal = placement =>
  (placement ? Object.values(placement) : []).reduce(
    (prior, cur) => prior + cur,
    0,
  );
const nodeCount = (count, force) => {
  if (count === 1) {
    return ` (${count} node)`;
  }
  if (count || force) {
    return ` (${count} nodes)`;
  }
  return '';
};

const askPlacement = PLACEMENTS => {
  let total = 0;
  for (const placement of Object.values(PLACEMENTS)) {
    total += calculateTotal(placement);
  }
  const count = nodeCount(total, true);
  const DONE = { name: `Done with allocation${count}`, value: '' };
  const NEW = { name: `Initialize new placement`, value: 'NEW' };

  const questions = [
    {
      name: 'PLACEMENT',
      type: 'list',
      message: `Where would you like to allocate nodes${count}?`,
      choices: [
        DONE,
        NEW,
        ...Object.keys(PLACEMENTS)
          .sort()
          .map(place => ({
            name: `${place}${nodeCount(calculateTotal(PLACEMENTS[place]))}`,
            value: place,
          })),
      ],
    },
  ];
  return inquirer.prompt(questions);
};

const askProvider = () => {
  const DONE = { name: `Return to allocation menu`, value: '' };
  const questions = [
    {
      name: 'PROVIDER',
      type: 'list',
      message: `For what provider would you like to create a new placement?`,
      choices: [
        DONE,
        ...Object.values(PROVIDERS).sort((nva, nvb) =>
          nva.name < nvb.name ? -1 : nva.name === nvb.name ? 0 : 1,
        ),
      ],
    },
  ];
  return inquirer.prompt(questions);
};

const doInit = async (progname, args) => {
  let [dir, NETWORK_NAME] = args.slice(1);
  if (!dir) {
    dir = SETUP_HOME;
  }
  if (!dir) {
    throw `Need: [dir] [[network name]]`;
  }
  await needNotExists(`${dir}/network.txt`);

  const adir = resolve(process.cwd(), dir);
  const SSH_PRIVATE_KEY_FILE = resolve(adir, `id_${SSH_TYPE}`);
  if (!NETWORK_NAME) {
    NETWORK_NAME = process.env.NETWORK_NAME;
  }
  if (!NETWORK_NAME) {
    NETWORK_NAME = basename(dir);
  }

  // TODO: Gather information and persist so they can change it before commit.
  let instance = 0;
  const PLACEMENTS = {};
  const PLACEMENT_PROVIDER = {};
  const lastPlacement = {};
  const DETAILS = {};
  try {
    await mkdir(dir);
  } catch (e) {}
  await chdir(dir);

  while (true) {
    let { PLACEMENT } = await askPlacement(PLACEMENTS);
    if (!PLACEMENT) {
      break;
    }
    let provider;
    let myDetails = {};
    if (PLACEMENT !== 'NEW') {
      const PROVIDER = PLACEMENT_PROVIDER[PLACEMENT];
      provider = PROVIDERS[PROVIDER];
    } else {
      const { PROVIDER } = await askProvider();
      if (!PROVIDER) {
        continue;
      }
      provider = PROVIDERS[PROVIDER];

      const setPlacement = () => {
        if (!lastPlacement[PROVIDER]) {
          lastPlacement[PROVIDER] = 0;
        }
        lastPlacement[PROVIDER]++;
        PLACEMENT = `${PROVIDER}${lastPlacement[PROVIDER]}`;
        PLACEMENT_PROVIDER[PLACEMENT] = PROVIDER;
      };

      if (provider.askDetails) {
        const { CANCEL, ...PLACEMENT_DETAILS } = await provider.askDetails(
          provider,
          myDetails,
        );
        if (CANCEL) {
          continue;
        }
        // Out with the old, in with the new.
        setPlacement();
        for (const vname of Object.keys(myDetails)) {
          delete DETAILS[vname][PLACEMENT];
        }
        myDetails = PLACEMENT_DETAILS;
        for (const vname of Object.keys(myDetails)) {
          if (!DETAILS[vname]) {
            DETAILS[vname] = {};
          }
          DETAILS[vname][PLACEMENT] = PLACEMENT_DETAILS[vname];
        }
      } else {
        setPlacement();
      }
    }

    const dcs =
      provider.datacenters &&
      (await provider.datacenters(provider, PLACEMENT, myDetails));
    const placement = PLACEMENTS[PLACEMENT] || {};
    if (dcs) {
      // Add our choices to the list.
      const already = { ...placement };
      dcs.forEach(nv => delete already[nv.value]);
      Object.entries(already).forEach(([dc, count]) => {
        if (!dcs) {
          dcs = [];
        }
        dcs.push({ name: dc, value: dc });
      });
      dcs.sort((nva, nvb) =>
        nva.name < nvb.name ? -1 : nva.name === nvb.name ? 0 : 1,
      );
    }

    // Allocate the datacenters.
    while (true) {
      const dcsWithNodeCount =
        dcs &&
        dcs.map(nv => {
          const ret = { ...nv };
          const num = placement[nv.value] || 0;
          if (num === 1) {
            ret.name += ` (${num} node)`;
          } else if (num) {
            ret.name += ` (${num} nodes)`;
          }
          return ret;
        });
      const { DATACENTER, NUM_NODES, MORE } = await provider.askDatacenter(
        provider,
        PLACEMENT,
        dcsWithNodeCount,
        placement,
      );
      if (NUM_NODES) {
        placement[DATACENTER] = NUM_NODES;
      } else {
        delete placement[DATACENTER];
      }
      if (!MORE) {
        break;
      }
    }
    PLACEMENTS[PLACEMENT] = placement;
  }

  // Collate the placement information.
  const OFFSETS = {};
  const DATACENTERS = {};
  for (const [PLACEMENT, placement] of Object.entries(PLACEMENTS)) {
    const offset = instance;
    DATACENTERS[PLACEMENT] = [];
    for (const dc of Object.keys(placement).sort()) {
      const nodes = [];
      for (let i = 0; i < placement[dc]; i++) {
        instance++;
        nodes.push(dc);
      }
      if (nodes.length == 0) {
        continue;
      }
      DATACENTERS[PLACEMENT].push(...nodes);
    }

    if (instance === offset) {
      // No nodes added.
      continue;
    }

    // Commit the final details.
    OFFSETS[PLACEMENT] = offset;
  }

  if (instance === 0) {
    throw `Aborting due to no nodes configured!`;
  }

  await createFile(
    `vars.tf`,
    `\
# Terraform configuration generated by "${progname} init"

variable "NETWORK_NAME" {
  default = "${NETWORK_NAME}"
}

variable "SSH_KEY_FILE" {
  default = "${SSH_PRIVATE_KEY_FILE}.pub"
}

variable "DATACENTERS" {
  default = ${tfStringify(DATACENTERS)}
}

variable "OFFSETS" {
  default = ${tfStringify(OFFSETS)}
}

${Object.keys(DETAILS)
  .sort()
  .map(
    vname => `\
variable ${JSON.stringify(vname)} {
  default = ${tfStringify(DETAILS[vname])}
}
`,
  )
  .join('\n')}
`,
  );

  // Go and create the specific files.
  const clusterPrefix = 'ag-chain-cosmos-';
  for (const PLACEMENT of Object.keys(PLACEMENT_PROVIDER).sort()) {
    const PROVIDER = PLACEMENT_PROVIDER[PLACEMENT];
    const provider = PROVIDERS[PROVIDER];
    await provider.createPlacementFiles(provider, PLACEMENT, clusterPrefix);
  }

  await createFile(
    `outputs.tf`,
    `\
output "public_ips" {
  value = {
${Object.keys(DATACENTERS)
  .sort()
  .map(p => `    ${p} = "\${module.${p}.public_ips}"`)
  .join('\n')}
  }
}

output "offsets" {
  value = "\${var.OFFSETS}"
}
`,
  );

  // Set empty password.
  await needDoRun([
    'ssh-keygen',
    '-N',
    '',
    '-t',
    SSH_TYPE,
    '-f',
    SSH_PRIVATE_KEY_FILE,
  ]);

  await createFile(
    PLAYBOOK_WRAPPER,
    `\
#! /bin/sh
exec ansible-playbook -f10 \\
  -eSETUP_HOME=${shellEscape(process.cwd())} \\
  -eNETWORK_NAME=\`cat ${shellEscape(resolve('network.txt'))}\` \\
  \${1+"\$@"}
`,
  );
  await chmod(PLAYBOOK_WRAPPER, '0755');

  await createFile(
    `ansible.cfg`,
    `\
[defaults]
inventory = ./provision/hosts
deprecation_warnings = False

[ssh_connection]
ssh_args = -oForwardAgent=yes -oUserKnownHostsFile=provision/ssh_known_hosts -oControlMaster=auto -oControlPersist=30m
pipelining = True
`,
  );

  await createFile(`network.txt`, NETWORK_NAME);
};

export default doInit;
