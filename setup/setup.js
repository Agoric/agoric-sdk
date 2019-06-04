import {resolve} from './files';

export const ACCOUNT_JSON = `account.json`;
export const ALLOCATE_FRESH_CLUSTERS = false;
export const PLAYBOOK_WRAPPER = `./ansible-playbook.sh`;
export const SETUP_DIR = resolve(__dirname, '../setup');
export const SSH_TYPE = 'ecdsa';
export const CHAIN_HOME = process.env.AG_SETUP_COSMOS_HOME;

export const playbook = (name, ...args) => {
  const fullPath = `${SETUP_DIR}/ansible/${name}`;
  return [PLAYBOOK_WRAPPER, fullPath, ...args];
};

export const sleep = (seconds, why) => {
  console.error(`Waiting ${seconds} seconds`, why || '');
  return new Promise((resolve, reject) => setInterval(resolve, 1000 * seconds));
};
