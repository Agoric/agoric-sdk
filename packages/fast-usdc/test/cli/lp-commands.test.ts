import { makeMarshal } from '@endo/marshal';
import anyTest, { type TestFn } from 'ava';
import { Command } from 'commander';
import { flags } from '../../tools/cli-tools.js';
import { mockStream } from '../../tools/mock-io.js';
import { addLPCommands } from '../../src/cli/lp-commands.js';

const makeTestContext = () => {
  const program = new Command();
  program.exitOverride();
  const out = [] as string[];
  const err = [] as string[];

  const USDC = 'usdcbrand';
  const FastLP = 'fastlpbrand';
  const slotToVal = {
    '0': USDC,
    '1': FastLP,
  };
  const valToSlot = {
    USDC: '0',
    FastLP: '1',
  };
  const marshaller = makeMarshal(
    val => valToSlot[val],
    slot => slotToVal[slot],
  );
  const now = () => 1234;

  addLPCommands(program, {
    vstorageKit: {
      // @ts-expect-error fake brands
      agoricNames: { brand: { FastLP, USDC } },
      marshaller,
    },
    stdout: mockStream<typeof process.stdout>(out),
    stderr: mockStream<typeof process.stderr>(err),
    env: {},
    now,
  });

  return { program, marshaller, out, err, USDC, FastLP, now };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;
test.beforeEach(async t => (t.context = await makeTestContext()));

test('fast-usdc lp deposit sub-command', async t => {
  const { program, marshaller, out, err, USDC, now } = t.context;
  const amount = 100;
  const argv = [
    ...`node fast-usdc lp deposit`.split(' '),
    ...flags({ amount }),
  ];
  t.log(...argv);
  await program.parseAsync(argv);

  const action = marshaller.fromCapData(JSON.parse(out.join('')));
  t.deepEqual(action, {
    method: 'executeOffer',
    offer: {
      id: `lpDeposit-${now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['fastUsdc'],
        callPipe: [['makeDepositInvitation', []]],
      },
      proposal: {
        give: {
          USDC: { brand: USDC, value: BigInt(amount) },
        },
      },
    },
  });

  t.is(
    err.join(''),
    'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
  );
});

test('fast-usdc lp withdraw sub-command', async t => {
  const { program, marshaller, out, err, FastLP, now } = t.context;
  const amount = 100;
  const argv = [
    ...`node fast-usdc lp withdraw`.split(' '),
    ...flags({ amount }),
  ];
  t.log(...argv);
  await program.parseAsync(argv);

  const action = marshaller.fromCapData(JSON.parse(out.join('')));
  t.deepEqual(action, {
    method: 'executeOffer',
    offer: {
      id: `lpWithdraw-${now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['fastUsdc'],
        callPipe: [['makeWithdrawInvitation', []]],
      },
      proposal: {
        give: {
          PoolShare: { brand: FastLP, value: BigInt(amount) },
        },
      },
    },
  });

  t.is(
    err.join(''),
    'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
  );
});
