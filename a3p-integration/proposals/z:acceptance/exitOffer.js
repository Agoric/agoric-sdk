// Note: limit imports to node modules for portability
import { parseArgs, promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';

const options = /** @type {const} */ ({
  id: { type: 'string' },
  from: { type: 'string' },
  bin: { type: 'string', default: '/usr/src/agoric-sdk/node_modules/.bin' },
});

const Usage = `
Try to exit an offer, reclaiming any associated payments.

  node exitOffer.js --id ID --from FROM [--bin PATH]

Options:
  --id <offer id>
  --from <address or key name>

  --bin <path to agoric and agd> default: ${options.bin.default}
`;

const badUsage = () => {
  const reason = new Error(Usage);
  reason.name = 'USAGE';
  throw reason;
};

const { stringify: jq } = JSON;
// limited to JSON data: no remotables/promises; no undefined.
const toCapData = data => ({ body: `#${jq(data)}`, slots: [] });

const { entries } = Object;
/**
 * @param {Record<string, string>} obj - e.g. { color: 'blue' }
 * @returns {string[]} - e.g. ['--color', 'blue']
 */
const flags = obj =>
  entries(obj)
    .map(([k, v]) => [`--${k}`, v])
    .flat();

const execP = promisify(execFile);

const showAndRun = (file, args) => {
  console.log('$', file, ...args);
  return execP(file, args);
};

const withTempFile = async (tail, fn) => {
  const tmpDir = await mkdtemp('offers-');
  const tmpFile = join(tmpDir, tail);
  try {
    const result = await fn(tmpFile);
    return result;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(err =>
      console.error(err),
    );
  }
};

const doAction = async (action, from) => {
  await withTempFile('offer.json', async tmpOffer => {
    await writeFile(tmpOffer, jq(toCapData(action)));

    const out = await showAndRun('agoric', [
      'wallet',
      ...flags({ 'keyring-backend': 'test' }),
      'send',
      ...flags({ offer: tmpOffer, from }),
    ]);
    return out.stdout;
  });
};

const main = async (argv, env) => {
  const { values } = parseArgs({ args: argv.slice(2), options });
  const { id: offerId, from, bin } = values;
  (offerId && from) || badUsage();

  env.PATH = `${bin}:${env.PATH}`;
  const action = { method: 'tryExitOffer', offerId };
  const out = await doAction(action, from);
  console.log(out);
};

main(process.argv, process.env).catch(e => {
  if (e.name === 'USAGE' || e.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
    console.error(e.message);
  } else {
    console.error(e);
  }
  process.exit(1);
});
