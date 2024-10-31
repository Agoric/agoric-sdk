import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';

const init = async (
  /** @type {import("fs").PathLike} */ configDir,
  /** @type {import("fs").PathLike} */ configPath,
  /** @type {object} */ options,
  out = console,
  rl = readline.createInterface({ input, output }),
) => {
  const showOverrideWarning = async () => {
    const answer = await rl.question(
      `Config at ${configPath} already exists. Override it? (To partially update, use "update", or set "--home" to use a different config path.) y/N`,
    );
    const confirmed = ['y', 'yes'].includes(answer.toLowerCase());
    if (!confirmed) {
      throw new Error('User cancelled');
    }
  };

  const writeConfig = async () => {
    if (!existsSync(configDir)) {
      mkdirSync(configDir);
    }
    await null;
    try {
      await writeFile(configPath, JSON.stringify(options, null, 2));
      out.log(`Config initialized at ${configPath}`);
    } catch (error) {
      out.error(`An unexpected error has occurred: ${error}`);
    }
  };

  await null;
  if (existsSync(configPath)) {
    try {
      await showOverrideWarning();
    } catch {
      return;
    }
  }
  await writeConfig();
};

const update = async (
  /** @type {import("fs").PathLike} */ configPath,
  /** @type {object} */ options,
  out = console,
) => {
  const updateConfig = async (/** @type {object} */ data) => {
    await null;
    const stringified = JSON.stringify(data, null, 2);
    try {
      await writeFile(configPath, stringified);
      out.log(`Config updated at ${configPath}`);
      out.log(stringified);
    } catch (error) {
      out.error(`An unexpected error has occurred: ${error}`);
    }
  };

  let file;
  await null;
  try {
    file = await readFile(configPath, 'utf-8');
  } catch {
    out.error(
      `No config found at ${configPath}. Use "init" to create one, or "--home" to specify config location.`,
    );
    return;
  }
  await updateConfig({ ...JSON.parse(file), ...options });
};

const show = async (
  /** @type {import("fs").PathLike} */ configPath,
  out = console,
) => {
  let file;
  await null;
  try {
    file = await readFile(configPath, 'utf-8');
  } catch {
    out.error(
      `No config found at ${configPath}. Use "init" to create one, or "--home" to specify config location.`,
    );
    return;
  }
  out.log(`Config found at ${configPath}:`);
  out.log(file);
};

export default { init, update, show };
