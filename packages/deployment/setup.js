/* global __dirname */
import chalk from 'chalk';

export const ACCOUNT_JSON = `account.json`;
export const DEFAULT_BOOT_TOKENS = `10000000000000000000000000uag`;
export const PLAYBOOK_WRAPPER = `./ansible-playbook.sh`;
export const SSH_TYPE = 'ecdsa';

export const setup = ({ resolve, env, setInterval }) => {
  const it = harden({
    SETUP_DIR: __dirname,
    SETUP_HOME: env.AG_SETUP_COSMOS_HOME
      ? resolve(env.AG_SETUP_COSMOS_HOME)
      : resolve('.'),
    playbook: (name, ...args) => {
      const fullPath = `${it.SETUP_DIR}/ansible/${name}.yml`;
      return [PLAYBOOK_WRAPPER, fullPath, ...args];
    },
    sleep: (seconds, why) => {
      console.error(chalk.yellow(`Waiting ${seconds} seconds`, why || ''));
      return new Promise(res => setInterval(res, 1000 * seconds));
    },
  });
  env.AG_SETUP_COSMOS_HOME = it.SETUP_HOME;
  return it;
};
