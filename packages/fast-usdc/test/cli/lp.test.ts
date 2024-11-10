import anyTest from 'ava';
import type { TestFn } from 'ava';

import {
  captureIO,
  replayIO,
} from '@agoric/casting/test/net-access-fixture.js';
import { initProgram } from '../../src/cli/cli.js';
import { encodeDetail } from '../../testing/rpc-api-tools.js';

const makeTestContext = async ({ env = process.env } = {}) => {
  return { fetch: globalThis.fetch, recording: !!env.RECORDING };
};
const test: TestFn<Awaited<ReturnType<typeof makeTestContext>>> = anyTest;
test.before(async t => (t.context = await makeTestContext()));

const webFixture = new Map(); // XXX TODO

test('deposit', async t => {
  const argv =
    'node fast-usdc-cli deposit 150.25 --agoric-api https://devnet.api.agoric.net:443'.split(
      ' ',
    );

  const io = t.context;
  const config = {
    rpcAddrs: ['http://0.0.0.0:26657'],
    chainName: 'agoriclocal',
  };

  const { fetch: fetchMock, web } = io.recording
    ? captureIO(io.fetch)
    : { fetch: replayIO(encodeDetail(webFixture)), web: new Map() };

  t.log('recording', io.recording);

  const modern = new Date('2024-06-01');
  let currentTime = modern.getTime();
  const now = () => {
    currentTime += 3 * 1000;
    return currentTime;
  };
  const env = {
    // agoric1ejktwlsx0vvwq5v0tatecv24fl566d55g0scg4
    UNSAFE_DEPOSIT_MNEMONIC:
      'section hope swing ugly useless boy stove drink into worth unknown vanish modify pass load walk right lion fuel pass foil section mention frog',
  };

  const prog = initProgram(undefined, undefined, {
    fetch: fetchMock,
    now,
    env,
  });

  const actual = await prog.parseAsync(argv);

  t.deepEqual(actual.args, 'TODO. i have no idea');
});
