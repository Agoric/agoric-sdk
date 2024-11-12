import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
   @typedef {{
    nobleSeed: string,
    ethSeed: string,
    nobleToAgoricChannel: string,
    agoricApi: string,
    nobleApi: string,
    nobleRpc: string,
    ethRpc: string,
    tokenMessengerAddress: string,
    tokenAddress: string
  }} ConfigOpts
 */

/** @typedef {import('../util/file').file} file */

const init = async (
  /** @type {file} */ configFile,
  /** @type {ConfigOpts} */ options,
  out = console,
  rl = readline.createInterface({ input, output }),
) => {
  const showOverrideWarning = async () => {
    const answer = await rl.question(
      `Config at ${configFile.path} already exists. Override it? (To partially update, use "update", or set "--home" to use a different config path.) y/N: `,
    );
    rl.close();
    const confirmed = ['y', 'yes'].includes(answer.toLowerCase());
    if (!confirmed) {
      throw new Error('User cancelled');
    }
  };

  const writeConfig = async () => {
    await null;
    try {
      await configFile.write(JSON.stringify(options, null, 2));
      out.log(`Config initialized at ${configFile.path}`);
    } catch (error) {
      out.error(`An unexpected error has occurred: ${error}`);
    }
  };

  await null;
  if (configFile.exists()) {
    try {
      await showOverrideWarning();
    } catch {
      return;
    }
  }
  await writeConfig();
};

const update = async (
  /** @type {file} */ configFile,
  /** @type {Partial<ConfigOpts>} */ options,
  out = console,
) => {
  const updateConfig = async (/** @type {ConfigOpts} */ data) => {
    await null;
    const stringified = JSON.stringify(data, null, 2);
    try {
      await configFile.write(stringified);
      out.log(`Config updated at ${configFile.path}`);
      out.log(stringified);
    } catch (error) {
      out.error(`An unexpected error has occurred: ${error}`);
    }
  };

  let file;
  await null;
  try {
    file = await configFile.read();
  } catch {
    out.error(
      `No config found at ${configFile.path}. Use "init" to create one, or "--home" to specify config location.`,
    );
    return;
  }
  await updateConfig({ ...JSON.parse(file), ...options });
};

const show = async (/** @type {file} */ configFile, out = console) => {
  let contents;
  await null;
  try {
    contents = await configFile.read();
  } catch {
    out.error(
      `No config found at ${configFile.path}. Use "init" to create one, or "--home" to specify config location.`,
    );
    return;
  }
  out.log(`Config found at ${configFile.path}:`);
  out.log(contents);
};

export default { init, update, show };
