import { basename } from 'path';
import {
  finishCosmosApp,
  finishCosmosConfig,
  finishCosmosGenesis,
} from './chain-config';

const { details: X } = assert;

export default async function setDefaultsMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs } = powers;
  const log = anylogger('agoric:set-defaults');

  const [prog, configDir] = rawArgs.slice(1);

  assert(
    prog === 'ag-chain-cosmos',
    X`<prog> must currently be 'ag-chain-cosmos'`,
  );

  let appFile;
  let configFile;
  let genesisFile;
  const baseName = basename(configDir);
  if (baseName === 'config.toml') {
    configFile = configDir;
  }
  if (baseName === 'genesis.json') {
    genesisFile = configDir;
  }
  if (baseName === 'app.toml') {
    appFile = configDir;
  }

  if (!configFile && !genesisFile && !appFile) {
    // Default behaviour: rewrite both configs.
    configFile = `${configDir}/config.toml`;
    genesisFile = `${configDir}/genesis.json`;
    appFile = `${configDir}/app.toml`;
  }

  const create = (fileName, contents) => {
    log('create', fileName);
    return fs.writeFile(fileName, contents);
  };

  if (appFile) {
    log(`read ${appFile}`);
    const appToml = await fs.readFile(appFile, 'utf-8');

    const newAppToml = finishCosmosApp({
      appToml,
    });
    await create(appFile, newAppToml);
  }

  if (configFile) {
    log(`read ${configFile}`);
    const { persistentPeers } = opts;
    const configToml = await fs.readFile(configFile, 'utf-8');

    const newConfigToml = finishCosmosConfig({
      configToml,
      persistentPeers,
    });
    await create(configFile, newConfigToml);
  }

  if (genesisFile) {
    log(`read ${genesisFile}`);
    const { importFrom } = opts;
    const [genesisJson, exportedGenesisJson] = await Promise.all([
      fs.readFile(genesisFile, 'utf-8'),
      importFrom && fs.readFile(`${importFrom}/exported-genesis.json`, 'utf-8'),
    ]);

    const newGenesisJson = finishCosmosGenesis({
      genesisJson,
      exportedGenesisJson,
    });

    await create(genesisFile, newGenesisJson);
  }
}
