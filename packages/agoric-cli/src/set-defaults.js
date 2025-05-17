import { basename } from 'path';
import { Fail } from '@endo/errors';
import {
  finishCosmosApp,
  finishTendermintConfig,
  finishCosmosGenesis,
} from './chain-config.js';

export default async function setDefaultsMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs } = powers;
  const log = anylogger('agoric:set-defaults');

  const [prog, configDir] = rawArgs.slice(1);
  prog === 'ag-chain-cosmos' ||
    Fail`<prog> must currently be 'ag-chain-cosmos'`;

  const { exportMetrics, enableCors } = opts;

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

  await null;
  if (appFile) {
    log(`read ${appFile}`);
    const appToml = await fs.readFile(appFile, 'utf-8');

    const newAppToml = finishCosmosApp({
      appToml,
      enableCors,
      exportMetrics,
    });
    await create(appFile, newAppToml);
  }

  if (configFile) {
    log(`read ${configFile}`);
    const { persistentPeers, seeds, unconditionalPeerIds } = opts;
    const configToml = await fs.readFile(configFile, 'utf-8');

    const newConfigToml = finishTendermintConfig({
      configToml,
      enableCors,
      persistentPeers,
      seeds,
      unconditionalPeerIds,
      exportMetrics,
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
