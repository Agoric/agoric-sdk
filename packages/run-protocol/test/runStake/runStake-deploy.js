// @ts-check
import { E } from '@endo/far';
import { ZipReader } from '@endo/zip';
import { encodeBase64, decodeBase64 } from '@endo/base64';

const CONTRACT_ROOTS = {
  runStake: './../../src/runStake/runStake.js',
  endoCAS: './endoCAS.js',
};

const config = {
  bundlerId: undefined, // '262188032',
};

const exploreBundle = bundle => {
  const zip = new ZipReader(decodeBase64(bundle.endoZipBase64));
  const cmap = JSON.parse(
    new TextDecoder().decode(zip.files.get('compartment-map.json').content),
  );
  const sizes = [...zip.files.entries()]
    .map(([name, entry]) => [entry.content.length, name])
    .sort((a, b) => a[0] - b[0])
    .reverse();

  const mdtable = rows =>
    rows.map(cols => cols.map(v => `${v}`).join(' | ')).join('\n');

  console.log(mdtable(sizes));
};

export const installInPieces = async (bundle, tool) => {
  const bundler = E(tool).makeBundler();

  const { endoZipBase64, ...shell } = bundle;
  const zip = new ZipReader(decodeBase64(endoZipBase64));

  for await (const [name, entry] of zip.files.entries()) {
    console.log('adding', name, entry.content.length, '...');
    const encodedContent = encodeBase64(entry.content);
    await E(bundler).add(name, encodedContent);
  }
  console.log('installing...');
  const installation = await E(bundler)
    .install(shell)
    .finally(() => E(bundler).clear());
  // console.log({ installation });
  return installation;
};

const installRunStake = async (homePromise, { bundleSource, pathResolve }) => {
  console.log('awaiting home promise...');
  const home = await homePromise;
  console.log('bundling endoCAS contract...');
  const bundles = {
    runStake: await bundleSource(pathResolve(CONTRACT_ROOTS.runStake)),
    endoCAS: await bundleSource(pathResolve(CONTRACT_ROOTS.endoCAS)),
  };
  //  exploreBundle(bundles.runStake);
  exploreBundle(bundles.endoCAS);
  console.log(
    Object.entries(bundles).map(([p, b]) => [p, b.endoZipBase64.length]),
  );

  if (!config.bundlerId) {
    console.log('installing endoCAS...');
    const installation = await E(home.zoe).install(bundles.endoCAS);
    console.log('publishing on board...');
    const { publicFacet } = await E(home.zoe).startInstance(installation);
    const boardStuff = {
      bundler: {
        installation: await E(home.board).getId(installation),
        publicFacet: await E(home.board).getId(publicFacet),
      },
    };
    console.log(boardStuff);
    config.bundlerId = boardStuff.bundler.publicFacet;
  }

  const tool = E(home.board).getValue(config.bundlerId);

  const installation = await installInPieces(bundles.runStake, tool);
  const stuff = {
    runStake: { installation: await E(home.board).getId(installation) },
  };
  console.log(stuff);
};

export default installRunStake;
