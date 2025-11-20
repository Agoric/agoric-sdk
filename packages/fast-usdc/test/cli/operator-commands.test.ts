import { makeMarshal, type Passable } from '@endo/marshal';
import test from 'ava';
import { Command } from 'commander';
import { type BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import { MockCctpTxEvidences } from '@agoric/fast-usdc/tools/mock-evidence.js';
import { addOperatorCommands } from '../../src/cli/operator-commands.js';
import { flags } from '../../tools/cli-tools.js';
import { mockStream } from '../../tools/mock-io.js';

const marshalData = makeMarshal(_v => assert.fail('data only'));

type NonEvidenceAttestArgs = {
  previousOfferId?: string | number;
  invokePower?: string;
  offerId?: string | number;
  invocationId?: string | number;
};

const testAttest = test.macro(
  async (
    t,
    nonEvidenceArgs: NonEvidenceAttestArgs,
    shouldFail: boolean = false,
  ) => {
    const evidence = harden(MockCctpTxEvidences.AGORIC_PLUS_DYDX());
    const { aux, tx, ...flat } = evidence;
    const argv = [
      ...`node fast-usdc operator attest`.split(' '),
      ...flags({ ...nonEvidenceArgs, ...aux, ...tx, ...flat }),
    ];
    t.log(...argv);
    const program = new Command();
    program.exitOverride();
    const out = [] as string[];
    const err = [] as string[];

    addOperatorCommands(program, {
      fetch: null as unknown as Window['fetch'],
      stdout: mockStream<typeof process.stdout>(out),
      stderr: mockStream<typeof process.stderr>(err),
      env: {},
      now: () => 1234,
    });

    const outcome = program.parseAsync(argv);

    if (shouldFail) {
      await t.throwsAsync(outcome);
    } else {
      await t.notThrowsAsync(outcome);

      const action = marshalData.fromCapData(JSON.parse(out.join('')));
      const expectedAction: BridgeAction = nonEvidenceArgs.previousOfferId
        ? {
            method: 'executeOffer',
            offer: {
              id: nonEvidenceArgs.offerId ?? 'operatorAttest-1234',
              invitationSpec: {
                invitationArgs: [evidence],
                invitationMakerName: 'SubmitEvidence',
                previousOffer: '123',
                source: 'continuing',
              },
              proposal: {},
            },
          }
        : {
            method: 'invokeEntry',
            message: {
              id: 'operatorAttestInvocation-1234',
              targetName: nonEvidenceArgs.invokePower ?? 'fastUsdcOperator',
              method: 'submitEvidence',
              // @ts-expect-error
              args: [evidence as Passable],
            },
          };

      t.deepEqual(action, expectedAction);

      t.is(
        err.join(''),
        'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
      );
    }
  },
);

test('fast-usdc operator attest sub-command - offer', testAttest, {
  previousOfferId: 123,
});

test('fast-usdc operator attest sub-command - invocation', testAttest, {});

test(
  'fast-usdc operator attest sub-command - invocation and previousOffer conflicts',
  testAttest,
  {
    previousOfferId: 123,
    invokePower: 'operator',
  },
  true,
);

test(
  'fast-usdc operator attest sub-command - invocationId and previousOffer conflicts',
  testAttest,
  {
    previousOfferId: 123,
    invocationId: 123,
  },
  true,
);
