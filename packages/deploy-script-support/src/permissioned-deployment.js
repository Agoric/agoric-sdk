/**
 * @file support for Contract Deployment Process
 *
 * 1. `agoric run XYZ.build.js` produces:
 *    - `b1-123.json` bundle x 2: contract, aux
 *    - `XYZ-permit.json`, `XYZ.js` script
 * 2. Install bundles
 *    - permissionless with per-byte fee in IST
 * 3. Submit CoreEval proposal to BLD stakers
 *    - `XYZ-permit.json`, `XYZ.js`
 *
 * @see {runBuilder}
 * @see {installBundles}
 * @see {submitCoreEval}
 */
import { flags } from '@agoric/pola-io';

/**
 * @import {CmdRunner} from '@agoric/pola-io';
 * @import {FileRd} from '@agoric/pola-io';
 */

/**
 *
 * TODO: builder should be a FileRd
 * TODO: parameterize dest dir
 *
 * @example
 * to use npx to find `agoric` in node_modules/.bin:
 *   const execP = promisify(childProcess.execFile)
 *   const agoric = makeCmdRunner('npx', { execFile: execP }).subCommand('agoric');
 *
 * XXX use a different name from execFile since the meaning is different
 *
 * @param {CmdRunner} agoric
 * @param {FileRd} builder
 * @param {Record<string, string | string[]>} [builderOpts]
 * @param {{cwd?: FileRd}} [io]
 *
 * @returns {Promise<Plan>}
 *
 * @typedef {{
 *   name: string,
 *   script: string,
 *   permit: string,
 *   bundles: { entrypoint:string, bundleID:string, fileName:string}[];
 * }} Plan
 */
export const runBuilder = async (
  agoric,
  builder,
  builderOpts = {},
  { cwd = builder.join('../../') } = {},
) => {
  const cmd = agoric.withFlags(...(builderOpts ? flags(builderOpts) : []));
  const { stdout } = await cmd.exec(['run', String(builder)]);
  const match = stdout?.match(/ (?<name>[-\w]+)-permit.json/);
  if (!(match && match.groups)) {
    throw Error('no permit found');
  }
  /** @type {Plan} */
  const plan = await cwd.join(`${match.groups.name}-plan.json`).readJSON();
  return plan;
};

export const txFlags = ({
  node,
  from,
  chainId,
  keyringBackend = 'test',
  broadcastMode = 'block',
}) => ({
  node,
  from,
  'chain-id': chainId,
  'keyring-backend': keyringBackend,
  'broadcast-mode': broadcastMode,
  // TODO: parameterize these?
  gas: 'auto',
  'gas-adjustment': '1.4',
});

/**
 * @param {CmdRunner} agd
 * @param {number} n
 */
export const waitForBlock = async (agd, n = 1) => {
  const getHeight = async () => {
    const { stdout } = await agd.exec(['status']);
    const { latest_block_height: height } = JSON.parse(stdout).SyncInfo;
    return height;
  };
  const initialHeight = await getHeight();
  const SEC = 1000;
  let currentHeight;
  do {
    await new Promise(resolve => setTimeout(resolve, 1 * SEC)); // XXX ambient
    currentHeight = await getHeight();
  } while (currentHeight - initialHeight < n);
  console.log('block height:', initialHeight, currentHeight);
};

/**
 * @param {CmdRunner} agd - agd with --from etc.
 * @param {string[]} txArgs
 */
export const runTx = async (agd, txArgs) => {
  const { stdout } = await agd.withFlags('-o', 'json').exec(['tx', ...txArgs]);
  const result = JSON.parse(stdout);
  if (result.code !== 0) {
    throw Object.assign(Error(result.raw_log), result);
  }
  return result;
};

/**
 * @param {CmdRunner} agd
 * @param {FileRd} bundle
 */
export const installBundle = async (agd, bundle) =>
  runTx(agd, ['swingset', 'install-bundle', `@${bundle}`]);

export const txAbbr = tx => {
  const { txhash, code, height, gas_used: g } = tx;

  return { txhash, code, height, gas_used: g };
};

/**
 * @param {CmdRunner} agd
 * @param {Plan['bundles']} bundles
 * @param {FileRd} files
 */
export const installBundles = (agd, bundles, files) => {
  const ps = bundles.map(b =>
    installBundle(agd, files.join(files.relative(b.fileName))),
  );
  return Promise.all(ps);
};

/**
 * @param {CmdRunner} agd
 * @param {Pick<Plan, 'permit' | 'script'>[]} evals
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {object} [opts.depositOpts]
 * @param {string} [opts.depositOpts.denom]
 * @param {number} [opts.depositOpts.unit]
 * @param {number} [opts.depositOpts.qty]
 * @param {string} [opts.deposit]
 */
export const submitCoreEval = async (
  agd,
  evals,
  {
    title = evals[0].script,
    description = title,
    depositOpts: { denom = 'ubld', unit = 1_000_000, qty = 10 } = {},
    deposit = `${qty * unit}${denom}`,
  } = {},
) =>
  runTx(agd, [
    ...'gov submit-proposal swingset-core-eval'.split(' '),
    ...evals.map(e => [e.permit, e.script]).flat(),
    ...flags({ title, description, deposit }),
  ]);

const max = xs => xs.reduce((hi, x) => (x > hi ? x : hi));

/**
 * @param {CmdRunner} agdq - with node opts
 * @param {CmdRunner} agdtx - with sign opts
 */
const acceptProposal = async (agdq, agdtx) => {
  const agdqj = agdq.withFlags('-o', 'json');

  const { proposals } = await agdqj
    .exec('query gov proposals'.split(' '))
    .then(proc => JSON.parse(proc.stdout));
  const proposalId = max(proposals.map(p => Number(p.proposal_id || p.id)));

  console.log(`Voting on proposal ID ${proposalId}`);
  await runTx(agdtx, ['gov', 'vote', `${proposalId}`, 'yes']);

  console.log(`Fetching details for proposal ID ${proposalId}`);
  const info = await agdq
    .exec(['query', 'gov', 'proposal', `${proposalId}`])
    .then(proc => JSON.parse(proc.stdout));

  const { proposal_id: pid, id, voting_end_time: t, status } = info;
  return { id: pid || id, voting_end_time: t, status };
};
