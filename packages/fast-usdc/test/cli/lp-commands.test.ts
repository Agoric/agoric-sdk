import { makeRatio } from '@agoric/ertp/src/ratio.js';
import type { EReturn } from '@endo/far';
import { Far, makeMarshal } from '@endo/marshal';
import anyTest, { type TestFn } from 'ava';
import { Command } from 'commander';
import { addLPCommands } from '../../src/cli/lp-commands.js';
import { flags } from '../../tools/cli-tools.js';
import { mockStream } from '../../tools/mock-io.js';

const makeTestContext = () => {
  const program = new Command();
  program.exitOverride();
  const out = [] as string[];
  const err = [] as string[];

  const USDC = Far('usdcbrand');
  const FastLP = Far('fastlpbrand');
  const slotToVal = {
    '0': USDC,
    '1': FastLP,
  };
  const valToSlot = val => {
    if (val === USDC) {
      return '0';
    }
    if (val === FastLP) {
      return '1';
    }
    return 'none';
  };

  const marshaller = makeMarshal(valToSlot, slot => slotToVal[slot]);
  const now = () => 1234;

  addLPCommands(program, {
    smartWalletKit: {
      // @ts-expect-error fake brands
      agoricNames: { brand: { FastLP, USDC } },
      marshaller,
      // @ts-expect-error ignore fancy return type
      readPublished: async (path: string) => {
        if (path === 'fastUsdc.poolMetrics') {
          // @ts-expect-error not real brands
          return { shareWorth: makeRatio(110n, USDC, 100n, FastLP) };
        }
        return {};
      },
    },
    stdout: mockStream<typeof process.stdout>(out),
    stderr: mockStream<typeof process.stderr>(err),
    env: {},
    now,
  });

  return { program, marshaller, out, err, USDC, FastLP, now };
};

const test = anyTest as TestFn<EReturn<typeof makeTestContext>>;
test.beforeEach(async t => (t.context = await makeTestContext()));

test('fast-usdc deposit command', async t => {
  const { program, marshaller, out, err, USDC, FastLP } = t.context;
  const amount = 100.05;
  const argv = [...`node fast-usdc deposit`.split(' '), ...flags({ amount })];
  t.log(...argv);
  await program.parseAsync(argv);

  const action = marshaller.fromCapData(JSON.parse(out.join('')));
  t.deepEqual(action, {
    method: 'executeOffer',
    offer: {
      id: `lpDeposit-1234`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['fastUsdc'],
        callPipe: [['makeDepositInvitation']],
      },
      proposal: {
        give: {
          USDC: { brand: USDC, value: 100_050_000n },
        },
        want: {
          PoolShare: { brand: FastLP, value: 90_954_545n },
        },
      },
    },
  });

  t.is(
    err.join(''),
    'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
  );
});

test('fast-usdc withdraw command', async t => {
  const { program, marshaller, out, err, FastLP, USDC } = t.context;
  const amount = 100;
  const argv = [...`node fast-usdc withdraw`.split(' '), ...flags({ amount })];
  t.log(...argv);
  await program.parseAsync(argv);

  const action = marshaller.fromCapData(JSON.parse(out.join('')));
  t.deepEqual(action, {
    method: 'executeOffer',
    offer: {
      id: `lpWithdraw-1234`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['fastUsdc'],
        callPipe: [['makeWithdrawInvitation']],
      },
      proposal: {
        give: {
          PoolShare: { brand: FastLP, value: 90_909_091n },
        },
        want: {
          USDC: { brand: USDC, value: 100_000_000n },
        },
      },
    },
  });

  t.is(
    err.join(''),
    'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
  );
});
