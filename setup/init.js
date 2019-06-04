import {CHAIN_HOME, SETUP_DIR, SSH_TYPE} from './setup';
import {basename, createFile, mkdir, needNotExists, resolve} from './files';
import {needDoRun} from './run';
import fetch from 'node-fetch';
import {prompt} from 'inquirer';

const calculateTotal = (placement) => Object.values(placement).reduce((prior, cur) => prior + cur, 0);

const ALL_PROVIDERS = {
    digitalocean: {
        defaultApiToken() {
            return process.env.DO_API_TOKEN;
        },
        datacenters: async (apikey) => {
            const res = await fetch('https://api.digitalocean.com/v2/regions', {
                headers: {'Authorization': `Bearer ${apikey}`},
            });
            const json = await res.json();
            return json.regions.map(r => ({name: r.name, value: r.slug.toUpperCase()}))
                .sort((nva, nvb) => nva.name < nvb.name ? -1 : nva.name === nvb.name ? 0 : 1);
        },
        createClusterFiles: (PROVIDER, CLUSTER, PREFIX) =>
            createFile(`${CLUSTER}.tf`, `\
module "${CLUSTER}" {
    source           = "${SETUP_DIR}/terraform/${PROVIDER}"
    CLUSTER_NAME     = "${PREFIX}\${var.NETWORK_NAME}-${CLUSTER}"
    OFFSET           = "\${var.OFFSETS["${CLUSTER}"]}"
    REGIONS          = "\${var.DATACENTERS["${CLUSTER}"]}"
    SSH_KEY_FILE     = "\${var.SSH_KEY_FILE}"
    DO_API_TOKEN     = "\${var.API_KEYS["${CLUSTER}"]}"
    SERVERS          = "\${length(var.DATACENTERS["${CLUSTER}"])}"
}
`),
    }
};
const askProvider = (NUM_NODES) => {
    const DONE = 'Finished';
    const questions = [
        {
            name: 'PROVIDER',
            type: 'list',
            message: `You have ${NUM_NODES} nodes; where would you like to allocate more?`,
            choices: [...Object.keys(ALL_PROVIDERS).sort(), DONE],
            filter: (provider) => provider === DONE ? '' : provider,
        },
    ];
    return prompt(questions);
};

const askApiKey = (PROVIDER) => {
    const questions = [    
        {
            name: 'API_KEY',
            type: 'input',
            message: `API Key for ${PROVIDER}?`,
            default: ALL_PROVIDERS[PROVIDER].defaultApiToken(),
            filter: (key) => key.trim(),
        }
    ];
    return prompt(questions);
};

const askDatacenter = (provider, dcs, placement) => {
    const questions = [];
    if (dcs) {
        questions.push({
            name: 'DATACENTER',
            type: 'list',
            message: `Which ${provider} datacenter?`,
            choices: dcs,
        });
    } else {
        questions.push({
            name: 'DATACENTER',
            type: 'input',
            message: `Which ${provider} datacenter?`,
            filter: (dc) => dc.trim(),
        })
    }
    questions.push({
        name: 'NUM_NODES',
        type: 'number',
        message: ({DATACENTER}) => `Number of nodes in ${provider} ${DATACENTER} (0 or more)?`,
        validate: (num) => Math.floor(num) === num && num >= 0,
    });
    questions.push({
        name: 'MORE',
        message: ({NUM_NODES, DATACENTER}) => {
            const newPlacement = {...placement, [DATACENTER]: NUM_NODES};
            const total = calculateTotal(newPlacement);
            return `You have ${total} nodes; do you want any more?`;
        },
        type: 'confirm',
        default: true,
    });
    return prompt(questions);
}

const doInit = async (progname, args) => {
    let [dir, NETWORK_NAME] = args.slice(1);
    if (!dir) {
      dir = CHAIN_HOME;
    }
    if (!dir) {
      throw `Need: [dir] [[network name]]`;
    }
    await needNotExists(`${dir}/ansible.cfg`);

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
    let instance = 0;
    const OFFSETS = {};
    const CLUSTER_PROVIDER = {};
    const lastCluster = {};
    const API_KEYS = {};
    const DATACENTERS = {};
    try {
      await mkdir(dir);
    } catch (e) {}
    process.chdir(dir);

    let total = 0;
    while (true) {
        const {PROVIDER} = await askProvider(total);
        if (!PROVIDER) {
            break;
        }
        const {API_KEY} = await askApiKey(PROVIDER)
        if (!API_KEY) {
            continue;
        }

        const provider = ALL_PROVIDERS[PROVIDER];
        if (!lastCluster[PROVIDER]) {
            lastCluster[PROVIDER] = 0;
        }
        lastCluster[PROVIDER] ++;
        const CLUSTER = PROVIDER; // `${PROVIDER}${lastCluster[PROVIDER]}`;
        const dcs = await provider.datacenters(API_KEY);

        const placement = {};
        while (true) {
            const {DATACENTER, NUM_NODES, MORE} = await askDatacenter(PROVIDER, dcs, placement);
            placement[DATACENTER] = NUM_NODES;
            total = calculateTotal(placement);
            if (!MORE) {
                break;
            }
        }

        const offset = instance;
        for (const dc of Object.keys(placement).sort()) {
            const nodes = [];
            for (let i = 0; i < placement[dc]; i ++) {
                instance ++;
                nodes.push(dc);
            }
            if (nodes.length == 0) {
                continue;
            }
            if (!DATACENTERS[CLUSTER]) {
                DATACENTERS[CLUSTER] = [];
            }
            DATACENTERS[CLUSTER].push(...nodes);
        }

        if (instance === offset) {
            // No nodes added.
            continue;
        }

        // Commit the final details.
        CLUSTER_PROVIDER[CLUSTER] = PROVIDER;
        OFFSETS[CLUSTER] = offset;
        API_KEYS[CLUSTER] = API_KEY;
    }

    if (instance === 0) {
      throw `Aborting due to no nodes configured!`;
    }

    await createFile(`vars.tf`, `\
# Terraform configuration generated by "${progname} init"

variable "NETWORK_NAME" {
  default = "${NETWORK_NAME}"
}

variable "SSH_KEY_FILE" {
  default = "${SSH_PRIVATE_KEY_FILE}.pub"
}

variable "DATACENTERS" {
  default = {
${Object.keys(DATACENTERS).sort().map(p => `    ${p} = ${JSON.stringify(DATACENTERS[p])}`).join('\n')}
  }
}

variable "OFFSETS" {
  default = {
${Object.keys(OFFSETS).sort().map(p => `     ${p} = ${OFFSETS[p]}`).join('\n')}
  }
}

variable "API_KEYS" {
  default = {
${Object.keys(API_KEYS).sort().map(p => `    ${p} = ${JSON.stringify(API_KEYS[p])}`).join('\n')}
  }
}
`);

    // Go and create the specific files.
    const clusterPrefix = 'ag-chain-cosmos-';
    for (const CLUSTER of Object.keys(DATACENTERS).sort()) {
        const PROVIDER = CLUSTER_PROVIDER[CLUSTER];
        const provider = ALL_PROVIDERS[PROVIDER];
        await provider.createClusterFiles(PROVIDER, CLUSTER, clusterPrefix);
    }

    await createFile(`outputs.tf`, `\
output "public_ips" {
  value = {
${Object.keys(DATACENTERS).sort().map(p => `    ${p} = "\${module.${p}.public_ips}"`).join('\n')}
  }
}

output "offsets" {
  value = "\${var.OFFSETS}"
}
`);

    // TODO: Do this all within Node so it works on Windows.
    if (BACKEND_TF) {
      await needDoRun(['sh', '-c',
        `sed -e 's!@WORKSPACE_NAME@!ag-chain-cosmos-${NETWORK_NAME}!g' ${shellEscape(BACKEND_TF)} > ${shellEscape(`backend.tf`)}`]);
    }
    // Set empty password.
    await needDoRun(['ssh-keygen', '-N', '', '-t', SSH_TYPE, '-f', SSH_PRIVATE_KEY_FILE])

    // Finish by writing ansible.cfg.
    await createFile(`ansible.cfg`, `\
[defaults]
inventory = ./hosts

[ssh_connection]
ssh_args = -oForwardAgent=yes -oUserKnownHostsFile=ssh_known_hosts -oControlMaster=auto -oControlPersist=30m
`);
};

export default doInit;
