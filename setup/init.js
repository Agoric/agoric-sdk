import {ACCOUNT_JSON, CHAIN_HOME, PLAYBOOK_WRAPPER, SETUP_DIR, SSH_TYPE} from './setup';
import {basename, chmod, createFile, mkdir, needNotExists, resolve} from './files';
import {chdir, needDoRun, shellEscape} from './run';
import fetch from 'node-fetch';
import {prompt} from 'inquirer';

const PROVIDERS = {
    digitalocean: {
        name: 'DigitalOcean https://cloud.digitalocean.com/',
        value: 'digitalocean',
        defaultApiToken() {
            return process.env.DO_API_TOKEN;
        },
        datacenters: async (apikey) => {
            const res = await fetch('https://api.digitalocean.com/v2/regions', {
                headers: {'Authorization': `Bearer ${apikey}`},
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
        createPlacementFiles: (PROVIDER, PLACEMENT, PREFIX) =>
            createFile(`placement-${PLACEMENT}.tf`, `\
module "${PLACEMENT}" {
    source           = "${SETUP_DIR}/terraform/${PROVIDER}"
    CLUSTER_NAME     = "${PREFIX}\${var.NETWORK_NAME}-${PLACEMENT}"
    OFFSET           = "\${var.OFFSETS["${PLACEMENT}"]}"
    REGIONS          = "\${var.DATACENTERS["${PLACEMENT}"]}"
    SSH_KEY_FILE     = "\${var.SSH_KEY_FILE}"
    DO_API_TOKEN     = "\${var.API_KEYS["${PLACEMENT}"]}"
    SERVERS          = "\${length(var.DATACENTERS["${PLACEMENT}"])}"
}
`),
    }
};

const calculateTotal = (placement) => (placement ? Object.values(placement) : []).reduce((prior, cur) => prior + cur, 0);
const nodeCount = (count, force) => {
    if (count === 1) {
        return ` (${count} node)`;
    } else if (count || force) {
        return ` (${count} nodes)`;
    }
    return '';
};

const genUserPassword = (NETWORK_NAME) => {
    const genRandomString = (len) =>
        [...Array(len)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
    return [`${NETWORK_NAME}${genRandomString(8)}`, genRandomString(14)];
};

const askPlacement = (PLACEMENTS) => {
    let total = 0;
    for (const placement of Object.values(PLACEMENTS)) {
        total += calculateTotal(placement);
    }
    const count = nodeCount(total, true);
    const DONE = {name: `Done with allocation${count}`, value: ''};
    const NEW = {name: `Initialize new placement`, value: 'NEW'}

    const questions = [
        {
            name: 'PLACEMENT',
            type: 'list',
            message: `Where would you like to allocate nodes${count}?`,
            choices: [DONE, NEW, ...Object.keys(PLACEMENTS).sort().map(place => ({name: `${place}${nodeCount(calculateTotal(PLACEMENTS[place]))}`, value: place}))],
        }
    ];
    return prompt(questions);
};

const askProvider = () => {
    const DONE = {name: `Return to allocation menu`, value: ''};
    const questions = [
        {
            name: 'PROVIDER',
            type: 'list',
            message: `For what provider would you like to create a new placement?`,
            choices: [DONE, ...Object.values(PROVIDERS).sort((nva, nvb) => nva.name < nvb.name ? -1 : nva.name === nvb.name ? 0 : 1)],
        },
    ];
    return prompt(questions);
};

const askApiKey = (provider, DEFAULT_KEY) => {
    const questions = [    
        {
            name: 'API_KEY',
            type: 'input',
            message: `API Key for ${provider.name}?`,
            default: DEFAULT_KEY,
            filter: (key) => key.trim(),
        }
    ];
    return prompt(questions);
};

const askDatacenter = async (PLACEMENT, dcs, placement) => {
    const questions = [];
    const count = nodeCount(calculateTotal(placement), true);
    const DONE = {name: `Done with ${PLACEMENT} placement${count}`, value: ''};
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
            filter: (dc) => dc.trim(),
        })
    }

    const {DATACENTER} = await prompt(questions);
    if (!DATACENTER) {
        return {MORE: false};
    }

    const {NUM_NODES} = await prompt([
        {
            name: 'NUM_NODES',
            type: 'number',
            message: `Number of nodes for ${PLACEMENT} ${DATACENTER} (0 or more)?`,
            default: placement[DATACENTER] || 0,
            validate: (num) => Math.floor(num) === num && num >= 0,
        }
    ]);
    return {DATACENTER, NUM_NODES, MORE: true};
}

const doInit = async (progname, args) => {
    let [dir, NETWORK_NAME] = args.slice(1);
    if (!dir) {
      dir = CHAIN_HOME;
    }
    if (!dir) {
      throw `Need: [dir] [[network name]]`;
    }
    await needNotExists(`${dir}/ag-chain-cosmos-network.txt`);

    const adir = resolve(process.cwd(), dir);
    const SSH_PRIVATE_KEY_FILE = resolve(adir, `id_${SSH_TYPE}`);
    const BACKEND_TF = process.env.AG_SETUP_COSMOS_BACKEND;
    if (!NETWORK_NAME) {
        NETWORK_NAME = process.env.CHAIN_NAME;
    }
    if (!NETWORK_NAME) {
      NETWORK_NAME = basename(dir);
    }

    // TODO: Gather information and persist so they can change it before commit.
    let instance = 0;
    const PLACEMENTS = {};
    const PLACEMENT_PROVIDER = {};
    const lastPlacement = {};
    const API_KEYS = {};
    try {
      await mkdir(dir);
    } catch (e) {}
    await chdir(dir);

    // Create new credentials.
    const [user, password] = genUserPassword(NETWORK_NAME);
    await createFile(ACCOUNT_JSON, JSON.stringify({user, password}, undefined, 2));
    
    while (true) {
        let {PLACEMENT} = await askPlacement(PLACEMENTS);
        if (!PLACEMENT) {
            break;
        }
        let provider;
        if (PLACEMENT !== 'NEW') {
            const PROVIDER = PLACEMENT_PROVIDER[PLACEMENT];
            provider = PROVIDERS[PROVIDER];
        } else {
            const {PROVIDER} = await askProvider();
            if (!PROVIDER) {
                continue;
            }
            provider = PROVIDERS[PROVIDER];
            const {API_KEY} = await askApiKey(provider, API_KEYS[PLACEMENT] || provider.defaultApiToken());
            if (!API_KEY) {
                continue;
            }
            if (!lastPlacement[PROVIDER]) {
                lastPlacement[PROVIDER] = 0;
            }
            lastPlacement[PROVIDER] ++;
            PLACEMENT = `${PROVIDER}${lastPlacement[PROVIDER]}`;
            API_KEYS[PLACEMENT] = API_KEY;
            PLACEMENT_PROVIDER[PLACEMENT] = PROVIDER;
        }

        const dcs = await provider.datacenters(API_KEYS[PLACEMENT]);
        const placement = PLACEMENTS[PLACEMENT] || {};
        if (dcs) {
            // Add our choices to the list.
            const already = {...placement};
            dcs.forEach(nv => delete already[nv.value]);
            Object.entries(already).forEach(([dc, count]) => {
                if (!dcs) {
                    dcs = [];
                }
                dcs.push({name: dc, value: dc});
            });
            dcs.sort((nva, nvb) => nva.name < nvb.name ? -1 : nva.name === nvb.name ? 0 : 1)
        }

        // Allocate the datacenters.
        while (true) {
            const dcsWithNodeCount = dcs && dcs.map(nv => {
                const ret = {...nv};
                const num = placement[nv.value] || 0;
                if (num === 1) {
                    ret.name += ` (${num} node)`
                } else if (num) {
                    ret.name += ` (${num} nodes)`
                }
                return ret;
            });
            const {DATACENTER, NUM_NODES, MORE} = await askDatacenter(PLACEMENT, dcsWithNodeCount, placement);
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
            for (let i = 0; i < placement[dc]; i ++) {
                instance ++;
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
    for (const PLACEMENT of Object.keys(PLACEMENT_PROVIDER).sort()) {
        const PROVIDER = PLACEMENT_PROVIDER[PLACEMENT];
        const provider = PROVIDERS[PROVIDER];
        await provider.createPlacementFiles(PROVIDER, PLACEMENT, clusterPrefix);
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

    await createFile(PLAYBOOK_WRAPPER, `\
#! /bin/sh
exec ansible-playbook -f10 \\
  -eCHAIN_HOME=${shellEscape(process.cwd())} \\
  -eNETWORK_NAME=${shellEscape(NETWORK_NAME)} \\
  \${1+"\$@"}
`);
    await chmod(PLAYBOOK_WRAPPER, '0755');

    await createFile(`ansible.cfg`, `\
[defaults]
inventory = ./hosts

[ssh_connection]
ssh_args = -oForwardAgent=yes -oUserKnownHostsFile=ssh_known_hosts -oControlMaster=auto -oControlPersist=30m
`);

    await createFile(`ag-chain-cosmos-network.txt`, NETWORK_NAME);
};

export default doInit;
