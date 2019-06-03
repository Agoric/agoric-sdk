import {createInterface} from 'readline';
import {resolve} from './files';

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
}

export const ask = (prompt, dflt, completions) => {
    const rl = createInterface(process.stdin, process.stdout, function completer(line) {
        if (completions) {
            const hits = completions.filter((c) => c.startsWith(line));
            return [hits.length ? hits : completions, line];
        }
        return [[], line];
  });

  if (dflt) {
      prompt = prompt.replace(/(\? )?$/, ` [Enter=${dflt}]$1`);
  }
  return new Promise((resolve) => {
    rl.question(prompt, (result) => {
      rl.close();
      if (!result.trim() && dflt) {
          result = dflt;
      }
      resolve(result);
    });
  });
}
