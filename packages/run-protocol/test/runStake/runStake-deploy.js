// @ts-check
import { E } from '@endo/far';
import { ZipReader } from '@endo/zip';
import { encodeBase64, decodeBase64 } from '@endo/base64';

const { entries } = Object;

const BUNDLER_ROOT = './endoCAS.js';
const CONTRACT_ROOTS = {
  runStake: './../../src/runStake/runStake.js',
  contractGovernor: '../../../governance/src/contractGovernor.js',
  committee: '../../../governance/src/committee.js',
};

const exploreBundle = bundle => {
  const zip = new ZipReader(decodeBase64(bundle.endoZipBase64));
  const cmap = JSON.parse(
    new TextDecoder().decode(zip.files.get('compartment-map.json').content),
  );
  cmap;
  const sizes = [...zip.files.entries()]
    .map(([name, entry]) => [entry.content.length, name])
    .sort((a, b) => a[0] - b[0])
    .reverse();

  const mdtable = rows =>
    rows.map(cols => cols.map(v => `${v}`).join(' | ')).join('\n');

  console.log(mdtable(sizes));
};

export const installInPieces = async (
  bundle,
  tool,
  opts = { maxBytesInFlight: 800_000 },
) => {
  const bundler = E(tool).makeBundler();

  const { endoZipBase64, ...shell } = bundle;
  const zip = new ZipReader(decodeBase64(endoZipBase64));

  let approxBytesInFlight = 0;
  let inFlightTransactions = [];
  for await (const [name, entry] of zip.files.entries()) {
    if (approxBytesInFlight >= opts.maxBytesInFlight) {
      await Promise.all(inFlightTransactions);
      approxBytesInFlight = 0;
      inFlightTransactions = [];
    }

    console.log('adding', name, entry.content.length, '...');
    const encodedContent = encodeBase64(entry.content);
    approxBytesInFlight += name.length + encodedContent.length;
    inFlightTransactions.push(E(bundler).add(name, encodedContent));
  }
  await Promise.all(inFlightTransactions);

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

  const ensureContractInstalled = async (name, root, tool = undefined) => {
    const found = await E(home.scratch).get(name);
    if (found) {
      console.log(name, 'already installed:', found);
      return found;
    }
    console.log(name, ': bundling contract...');
    const bundle = await bundleSource(pathResolve(root));
    console.log({ root, length: bundle.endoZipBase64.length });

    console.log(name, ': installing...');
    const installation = await (tool
      ? installInPieces(bundle, tool)
      : E(home.zoe).install(bundle));
    const result = {
      installation,
      boardId: {
        installation: await E(home.board).getId(installation),
      },
    };
    console.log(name, ': saving to scratch...', result);
    await E(home.scratch).set(name, result);
    return result;
  };

  const ensureBundlerStarted = async () => {
    const found = await ensureContractInstalled('bundler', BUNDLER_ROOT);
    if (found && found.publicFacet) {
      console.log('bundler already started:', found);
      return found;
    }
    const { instance, publicFacet } = await E(home.zoe).startInstance(
      found.installation,
    );
    console.log('publishing on board...');
    const bundler = {
      installation: found.installation,
      instance,
      publicFacet,
      boardId: {
        installation: found.boardId.installation,
        publicFacet: await E(home.board).getId(publicFacet),
      },
    };
    console.log({ bundler });
    console.log('saving bundler to scatch...');
    await E(home.scratch).set('bundler', bundler);
    return bundler;
  };

  const bundlerInfo = await ensureBundlerStarted();
  const tool = bundlerInfo.publicFacet;

  await Promise.all(
    entries(CONTRACT_ROOTS).map(([name, root]) =>
      ensureContractInstalled(name, root, tool),
    ),
  );
};

export default installRunStake;
