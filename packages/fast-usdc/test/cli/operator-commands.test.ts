import type { Passable } from '@endo/pass-style';
import test from 'ava';
import { Command } from 'commander';
import { addOperatorCommands } from '../../src/cli/operator-commands.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import { makeMarshal } from '@endo/marshal';

export const flags = (
  record: Record<string, string | number | bigint | undefined>,
): string[] => {
  // @ts-expect-error undefined is filtered out
  const skipUndef: [string, string][] = Object.entries(record).filter(
    ([_k, v]) => v !== undefined,
  );
  return skipUndef.map(([k, v]) => [`--${k}`, `${v}`]).flat();
};

const marshalData = makeMarshal(_v => assert.fail('data only'));

test('fast-usdc operator attest sub-command', async t => {
  const evidence = harden(MockCctpTxEvidences.AGORIC_PLUS_DYDX());
  const { aux, tx, ...flat } = evidence;
  const argv = [
    ...`node fast-usdc operator attest`.split(' '),
    ...flags({
      previousOfferId: 123,
      forwardingChannel: aux.forwardingChannel,
      recipientAddress: aux.recipientAddress,
      amount: tx.amount,
      forwardingAddress: tx.forwardingAddress,
      ...flat,
    }),
  ];
  const program = new Command();
  program.exitOverride();
  const out = [] as string[];
  const err = [] as string[];

  addOperatorCommands(program, {
    fetch: null as unknown as Window['fetch'],
    stdout: {
      write: txt => {
        out.push(txt);
        return true;
      },
    } as unknown as typeof process.stdout,
    stderr: {
      write: txt => {
        err.push(txt);
        return true;
      },
    } as unknown as typeof process.stderr,
    env: {},
    now: () => 1234,
  });

  await program.parseAsync(argv);

  const action = marshalData.fromCapData(JSON.parse(out.join('')));
  t.deepEqual(action, {
    method: 'executeOffer',
    offer: {
      id: 'operatorAttest-1234',
      invitationSpec: {
        invitationArgs: [evidence],
        invitationMakerName: 'SubmitEvidence',
        previousOffer: '123',
        source: 'continuing',
      },
      proposal: {},
    },
  });

  t.is(
    err.join(''),
    'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
  );
});
