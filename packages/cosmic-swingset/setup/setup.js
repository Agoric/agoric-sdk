import chalk from 'chalk';
import { resolve } from './files';

export const ACCOUNT_JSON = `account.json`;
export const DEFAULT_BOOT_TOKENS = `1000000agmedallion`;
export const PLAYBOOK_WRAPPER = `./ansible-playbook.sh`;
export const SETUP_DIR = resolve(__dirname, '../setup');
export const SSH_TYPE = 'ecdsa';
export const SETUP_HOME = process.env.AG_SETUP_COSMOS_HOME
  ? resolve(process.env.AG_SETUP_COSMOS_HOME)
  : resolve('.');
process.env.AG_SETUP_COSMOS_HOME = SETUP_HOME;

export const playbook = (name, ...args) => {
  const fullPath = `${SETUP_DIR}/ansible/${name}.yml`;
  return [PLAYBOOK_WRAPPER, fullPath, ...args];
};

export const sleep = (seconds, why) => {
  console.error(chalk.yellow(`Waiting ${seconds} seconds`, why || ''));
  return new Promise(res => setInterval(res, 1000 * seconds));
};
