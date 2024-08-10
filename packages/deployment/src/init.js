// @ts-check

import { Fail } from '@endo/errors';
import { isObject } from '@endo/marshal';
import { PLAYBOOK_WRAPPER, SSH_TYPE } from './setup.js';
import { shellEscape } from './run.js';

export const AVAILABLE_ROLES = ['validator', 'peer', 'seed'];

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

const tfStringify = obj => {
  let ret = '';
  if (Array.isArray(obj)) {
    ret += '[';
    let sep = '';
    for (const el of obj) {
      ret += sep + tfStringify(el);
      sep = ',';
    }
    ret += ']';
  } else if (isObject(obj)) {
    ret += '{';
    let sep = '';
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

const genericAskApiKey =
  ({ env, inquirer }) =>
  async (provider, myDetails) => {
    const questions = [
      {
        name: 'API_KEYS',
        type: 'input',
        message: `API Key for ${provider.name}?`,
        default: myDetails.API_KEYS || env.DO_API_TOKEN,
        filter: key => key.trim(),
      },
    ];
    const ret = await inquirer.prompt(questions);
    if (!ret.API_KEYS) {
      return { CANCEL: true };
    }
    return ret;
  };

const genericAskDatacenter =
  ({ inquirer }) =>
  async (provider, PLACEMENT, dcs, placement) => {
    const questions = [];
    const count = nodeCount(calculateTotal(placement), true);
    const DONE = {
      name: `Done with ${PLACEMENT} placement${count}`,
      value: '',
    };
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

const makeProviders = ({ env, inquirer, wr, setup, fetch }) => ({
  docker: {
    name: 'Docker instances',
    value: 'docker',
    askDetails: async (_provider, _myDetails) => {
      let vspec = '';
      if (env.DOCKER_VOLUMES) {
        vspec += `,${env.DOCKER_VOLUMES}`;
      }
      return {
        VOLUMES: vspec
          .split(',')
          .filter(vol => vol.trim())
          .map(vol => vol.split(':'))
          /* eslint-disable camelcase */
          .map(([host_path, container_path]) => ({
            host_path,
            container_path,
          })),
        /* eslint-enable */
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
      wr.createFile(
        `placement-${PLACEMENT}.tf`,
        `\
module "${PLACEMENT}" {
    source           = "${setup.SETUP_DIR}/terraform/${provider.value}"
    CLUSTER_NAME     = "${PREFIX}\${var.NETWORK_NAME}-${PLACEMENT}"
    OFFSET           = "\${var.OFFSETS["${PLACEMENT}"]}"
    SSH_KEY_FILE     = "${PLACEMENT}-\${var.SSH_KEY_FILE}"
    ROLE             = "\${var.ROLES["${PLACEMENT}"]}"
    SERVERS          = "\${length(var.DATACENTERS["${PLACEMENT}"])}"
    VOLUMES          = "\${var.VOLUMES["${PLACEMENT}"]}"
}
`,
      ),
  },
  digitalocean: {
    name: 'DigitalOcean https://cloud.digitalocean.com/',
    value: 'digitalocean',
    askDetails: genericAskApiKey({ env, inquirer }),
    askDatacenter: genericAskDatacenter({ inquirer }),
    datacenters: async (provider, PLACEMENT, DETAILS) => {
      const { API_KEYS: apikey } = DETAILS;
      const res = await fetch('https://api.digitalocean.com/v2/regions', {
        headers: { Authorization: `Bearer ${apikey}` },
      });
      const json = await res.json();
      if (!json.regions) {
        console.error(`Cannot retrieve digitalocean regions:`, json);
        return [];
      }
      return json.regions.map(r => ({
        name: `${r.slug} - ${r.name}`,
        value: r.slug,
      }));
    },
    createPlacementFiles: (provider, PLACEMENT, PREFIX) =>
      wr.createFile(
        `placement-${PLACEMENT}.tf`,
        `\
module "${PLACEMENT}" {
    source           = "${setup.SETUP_DIR}/terraform/${provider.value}"
    CLUSTER_NAME     = "${PREFIX}\${var.NETWORK_NAME}-${PLACEMENT}"
    OFFSET           = "\${var.OFFSETS["${PLACEMENT}"]}"
    REGIONS          = "\${var.DATACENTERS["${PLACEMENT}"]}"
    ROLE             = "\${var.ROLES["${PLACEMENT}"]}"
    # TODO: DigitalOcean provider module doesn't allow reuse of SSH public keys.
    SSH_KEY_FILE     = "${PLACEMENT}-\${var.SSH_KEY_FILE}"
    DO_API_TOKEN     = "\${var.API_KEYS["${PLACEMENT}"]}"
    SERVERS          = "\${length(var.DATACENTERS["${PLACEMENT}"])}"
}
`,
      ),
  },
});

const askPlacement =
  ({ inquirer }) =>
  async (PLACEMENTS, ROLES) => {
    let total = 0;
    PLACEMENTS.forEach(
      ([_PLACEMENT, placement]) => (total += calculateTotal(placement)),
    );
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
          ...PLACEMENTS.map(([place, placement]) => ({
            name: `${ROLES[place]} - ${place}${nodeCount(
              calculateTotal(placement),
            )}`,
            value: place,
          })),
        ],
      },
    ];

    const first = await inquirer.prompt(questions);

    const roleQuestions = [
      {
        name: 'ROLE',
        type: 'list',
        message: `Role for the ${first.PLACEMENT} placement?`,
        choices: AVAILABLE_ROLES,
      },
    ];
    const second = first.PLACEMENT ? await inquirer.prompt(roleQuestions) : {};

    return { ...first, ...second };
  };

const askProvider =
  ({ inquirer }) =>
  PROVIDERS => {
    const DONE = { name: `Return to allocation menu`, value: '' };
    const questions = [
      {
        name: 'PROVIDER',
        type: 'list',
        message: `For what provider would you like to create a new placement?`,
        choices: [
          DONE,
          ...Object.values(PROVIDERS).sort((nva, nvb) => {
            if (nva.name < nvb.name) {
              return -1;
            }
            if (nva.name === nvb.name) {
              return 0;
            }
            return 1;
          }),
        ],
      },
    ];
    return inquirer.prompt(questions);
  };

const doInit =
  ({ env, rd, wr, running, setup, inquirer, fetch, parseArgs }) =>
  async (progname, args) => {
    const { needDoRun, needBacktick, cwd, chdir } = running;
    const PROVIDERS = makeProviders({
      env,
      inquirer,
      wr,
      setup,
      fetch,
      needBacktick,
    });

    const { _: parsedArgs, noninteractive } = parseArgs(args.slice(1), {
      boolean: ['noninteractive'],
    });
    let [dir, overrideNetworkName] = parsedArgs;

    if (!dir) {
      dir = setup.SETUP_HOME;
    }
    dir || Fail`Need: [dir] [[network name]]`;
    await wr.mkdir(dir, { recursive: true });
    await chdir(dir);

    const networkTxt = `network.txt`;
    if (await rd.exists(networkTxt)) {
      overrideNetworkName = (await rd.readFile(networkTxt, 'utf-8')).trimEnd();
    }

    if (!overrideNetworkName) {
      overrideNetworkName = env.NETWORK_NAME;
    }
    if (!overrideNetworkName) {
      overrideNetworkName = rd.basename(dir);
    }

    // Gather saved information.
    const deploymentJson = `deployment.json`;
    const config = (await rd.exists(deploymentJson))
      ? JSON.parse(await rd.readFile(deploymentJson, 'utf-8'))
      : {};

    const defaultConfigs = {
      PLACEMENTS: [],
      PLACEMENT_PROVIDER: {},
      SSH_PRIVATE_KEY_FILE: `id_${SSH_TYPE}`,
      DETAILS: {},
      OFFSETS: {},
      ROLES: {},
      DATACENTERS: {},
      PROVIDER_NEXT_INDEX: {},
    };
    Object.entries(defaultConfigs).forEach(([key, dflt]) => {
      if (!(key in config)) {
        config[key] = dflt;
      }
    });
    config.NETWORK_NAME = overrideNetworkName;

    while (!noninteractive) {
      const { ROLE, ...rest } = await askPlacement({ inquirer })(
        config.PLACEMENTS,
        config.ROLES,
      );
      let { PLACEMENT } = rest;
      if (!PLACEMENT) {
        break;
      }
      let provider;
      let myDetails = {};
      if (PLACEMENT !== 'NEW') {
        config.ROLES[PLACEMENT] = ROLE;
        const PROVIDER = config.PLACEMENT_PROVIDER[PLACEMENT];
        provider = PROVIDERS[PROVIDER];
      } else {
        const { PROVIDER } = await askProvider({ inquirer })(PROVIDERS);
        if (!PROVIDER) {
          continue;
        }
        provider = PROVIDERS[PROVIDER];

        const setPlacement = () => {
          if (config.PLACEMENT_PROVIDER[PLACEMENT]) {
            // Already present.
            return;
          }

          const idx = config.PROVIDER_NEXT_INDEX;
          if (!idx[PROVIDER]) {
            idx[PROVIDER] = 0;
          }
          idx[PROVIDER] += 1;
          PLACEMENT = `${PROVIDER}${idx[PROVIDER]}`;
          config.ROLES[PLACEMENT] = ROLE;
          config.PLACEMENT_PROVIDER[PLACEMENT] = PROVIDER;
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
            delete config.DETAILS[vname][PLACEMENT];
          }
          myDetails = PLACEMENT_DETAILS;
          for (const vname of Object.keys(myDetails)) {
            if (!config.DETAILS[vname]) {
              config.DETAILS[vname] = {};
            }
            config.DETAILS[vname][PLACEMENT] = PLACEMENT_DETAILS[vname];
          }
        } else {
          setPlacement();
        }
      }

      const dcs =
        provider.datacenters &&
        (await provider.datacenters(provider, PLACEMENT, myDetails));
      config.ROLES;
      const [_p, placement] = config.PLACEMENTS.find(
        ([p]) => p === PLACEMENT,
      ) || [PLACEMENT, {}];
      if (dcs) {
        // Add our choices to the list.
        const already = { ...placement };
        dcs.forEach(nv => delete already[nv.value]);
        Object.entries(already).forEach(([dc]) => {
          dcs.push({ name: dc, value: dc });
        });
        dcs.sort((nva, nvb) => {
          if (nva.name < nvb.name) {
            return -1;
          }
          if (nva.name === nvb.name) {
            return 0;
          }
          return 1;
        });
      }

      // Allocate the datacenters.
      // eslint-disable-next-line no-constant-condition
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
      if (!config.PLACEMENTS.find(([place]) => place === PLACEMENT)) {
        config.PLACEMENTS.push([PLACEMENT, placement]);
      }
    }

    // Collate the placement information.
    const ROLE_INSTANCE = {};
    Object.values(config.ROLES).forEach(role => {
      ROLE_INSTANCE[role] = 0;
    });
    for (const [PLACEMENT, placement] of config.PLACEMENTS) {
      let instance = ROLE_INSTANCE[config.ROLES[PLACEMENT]];
      const offset = instance;
      config.DATACENTERS[PLACEMENT] = [];
      for (const dc of Object.keys(placement).sort()) {
        const nodes = [];
        for (let i = 0; i < placement[dc]; i += 1) {
          instance += 1;
          nodes.push(dc);
        }
        if (nodes.length !== 0) {
          config.DATACENTERS[PLACEMENT].push(...nodes);
        }
      }

      if (instance === offset) {
        // No nodes added.

        continue;
      }

      // Commit the final details.
      ROLE_INSTANCE[config.ROLES[PLACEMENT]] = instance;
      config.OFFSETS[PLACEMENT] = offset;
    }
    Object.values(ROLE_INSTANCE).some(i => i > 0) ||
      Fail`Aborting due to no nodes configured! (${ROLE_INSTANCE})`;

    await wr.createFile(
      `vars.tf`,
      `\
# Terraform configuration generated by "${progname} init"

variable "NETWORK_NAME" {
  default = "${config.NETWORK_NAME}"
}

variable "SSH_KEY_FILE" {
  default = "${config.SSH_PRIVATE_KEY_FILE}.pub"
}

variable "DATACENTERS" {
  default = ${tfStringify(config.DATACENTERS)}
}

variable "OFFSETS" {
  default = ${tfStringify(config.OFFSETS)}
}

variable "ROLES" {
  default = ${tfStringify(config.ROLES)}
}

${Object.keys(config.DETAILS)
  .sort()
  .map(
    vname => `\
variable ${JSON.stringify(vname)} {
  default = ${tfStringify(config.DETAILS[vname])}
}
`,
  )
  .join('\n')}
`,
    );

    // Go and create the specific files.
    const clusterPrefix = 'ag-';
    for (const PLACEMENT of Object.keys(config.PLACEMENT_PROVIDER).sort()) {
      const PROVIDER = config.PLACEMENT_PROVIDER[PLACEMENT];
      const provider = PROVIDERS[PROVIDER];

      // Create a placement-specific key file.
      const keyFile = `${PLACEMENT}-${config.SSH_PRIVATE_KEY_FILE}`;
      if (!(await rd.exists(keyFile))) {
        // Set empty password.
        await needDoRun([
          'ssh-keygen',
          '-N',
          '',
          '-t',
          SSH_TYPE,
          '-f',
          keyFile,
        ]);
      }

      await provider.createPlacementFiles(provider, PLACEMENT, clusterPrefix);
    }

    await wr.createFile(
      `outputs.tf`,
      `\
output "public_ips" {
  value = {
${Object.keys(config.DATACENTERS)
  .sort()
  .map(p => `    ${p} = "\${module.${p}.public_ips}"`)
  .join('\n')}
  }
}

output "roles" {
  value = "\${var.ROLES}"
}

output "offsets" {
  value = "\${var.OFFSETS}"
}
`,
    );

    const keyFile = config.SSH_PRIVATE_KEY_FILE;
    if (!(await rd.exists(keyFile))) {
      // Set empty password.
      await needDoRun(['ssh-keygen', '-N', '', '-t', SSH_TYPE, '-f', keyFile]);
    }

    await wr.createFile(
      PLAYBOOK_WRAPPER,
      `\
#! /bin/sh
exec ansible-playbook -f10 \\
  -eSETUP_HOME=${shellEscape(cwd())} \\
  -eAGORIC_SDK=${shellEscape(setup.AGORIC_SDK)} \\
  -eNETWORK_NAME=\`cat ${shellEscape(rd.resolve('network.txt'))}\` \\
  \${1+"$@"}
`,
    );
    await wr.chmod(PLAYBOOK_WRAPPER, '0755');

    await wr.createFile(
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

    // Persist data for later.
    await wr.createFile(deploymentJson, JSON.stringify(config, undefined, 2));
    await wr.createFile(networkTxt, config.NETWORK_NAME);
  };

export { doInit };
