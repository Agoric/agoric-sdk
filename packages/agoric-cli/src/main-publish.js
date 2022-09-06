/* global process */
// @ts-check

import path from 'path';

import { SigningStargateClient } from '@cosmjs/stargate';

import { parseLocatedJson } from './json.js';

import { makeBundlePublisher, makeCosmosBundlePublisher } from './publish.js';

const publishMain = async (progname, rawArgs, powers, opts) => {
  const { fs } = powers;

  const { node: rpcAddress, home: homeDirectory, chainID = 'agoric' } = opts;

  if (typeof rpcAddress !== 'string') {
    throw new Error(
      `Required flag for agoric publish: -n, --node <rpcAddress>`,
    );
  }
  if (typeof homeDirectory !== 'string') {
    throw new Error(
      `Required flag for agoric publish: -h, --home <directory>, containing ag-solo-mnemonic`,
    );
  }

  /** @type {import('./publish.js').CosmosConnectionSpec} */
  const connectionSpec = {
    type: 'chain-cosmos-sdk',
    rpcAddresses: [rpcAddress],
    homeDirectory,
    chainID,
  };

  for (const bundlePath of rawArgs.slice(1)) {
    // AWAIT
    // eslint-disable-next-line no-await-in-loop,@jessie.js/no-nested-await
    const bundleText = await fs.readFile(bundlePath, 'utf-8');
    const bundle = parseLocatedJson(bundleText, bundlePath);

    const publishBundleCosmos = makeCosmosBundlePublisher({
      connectWithSigner: SigningStargateClient.connectWithSigner,
      pathResolve: path.resolve,
      readFile: fs.readFile,
      random: Math.random,
    });
    const publishBundle = makeBundlePublisher({
      getDefaultConnection() {
        throw new Error(
          'Invariant: publishBundle will never call getDefaultConnection because we provide an explicit connectionSpec',
        );
      },
      publishBundleCosmos,
    });

    // AWAIT
    // eslint-disable-next-line no-await-in-loop,@jessie.js/no-nested-await
    const hashedBundle = await publishBundle(bundle, connectionSpec);
    process.stdout.write(`${JSON.stringify(hashedBundle)}\n`);
  }
};

export default publishMain;
