import {resolve} from './files';

export const ALLOCATE_FRESH_CLUSTERS = false;
export const SETUP_DIR = resolve(__dirname, '../setup');
export const SSH_TYPE = 'ecdsa';
export const CHAIN_HOME = process.env.AG_SETUP_COSMOS_HOME;

export const playbook = (name) => {
  const fullPath = `${SETUP_DIR}/ansible/${name}`;
  return ['ansible-playbook', `-essh_known_hosts=${process.cwd()}/ssh_known_hosts`, fullPath];
};

export const sleep = (seconds, why) => {
  console.error(`Waiting ${seconds} seconds`, why || '');
  return new Promise((resolve, reject) => setInterval(resolve, 1000 * seconds));
};
