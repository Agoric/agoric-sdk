import { finishCosmosConfigs } from './chain-config';

export default async function setDefaultsMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs } = powers;
  const log = anylogger('agoric:set-defaults');

  const [prog, configDir] = rawArgs.slice(1);

  if (prog !== 'ag-chain-cosmos') {
    throw Error(`<prog> must currently be 'ag-chain-cosmos'`);
  }

  log(`read ${prog} config from ${configDir}`);

  const genesisFile = `${configDir}/genesis.json`;
  const configFile = `${configDir}/config.toml`;
  const { importFrom } = opts;
  const [genesisJson, configToml, exportedGenesisJson] = await Promise.all([
    fs.readFile(genesisFile, 'utf-8'),
    fs.readFile(configFile, 'utf-8'),
    importFrom && fs.readFile(`${importFrom}/exported-genesis.json`, 'utf-8'),
  ]);
  const { newGenesisJson, newConfigToml } = finishCosmosConfigs({
    genesisJson,
    configToml,
    exportedGenesisJson,
  });

  const create = (fileName, contents) => {
    log('create', fileName);
    return fs.writeFile(fileName, contents);
  };

  // Save all the files to disk.
  return Promise.all([
    create(configFile, newConfigToml),
    create(genesisFile, newGenesisJson),
  ]);
}
