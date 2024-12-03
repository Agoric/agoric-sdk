import type { Passable } from '@endo/pass-style';
import test from 'ava';
import { Command } from 'commander';
import { addOperatorCommands } from '../../src/cli/operator-commands.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import { makeMarshal } from '@endo/marshal';

export const flags = (
  record: Record<string, string | number | undefined>,
): string[] => {
  // @ts-expect-error undefined is filtered out
  const skipUndef: [string, string][] = Object.entries(record).filter(
    ([_k, v]) => v !== undefined,
  );
  return skipUndef.map(([k, v]) => [`--${k}`, v]).flat();
};

const marshalData = makeMarshal(_v => assert.fail('data only'));

test('fast-usdc operator attest sub-command', async t => {
  const evidence = harden(
    MockCctpTxEvidences.AGORIC_PLUS_DYDX(),
  ) as unknown as Passable;
  const argv = [
    ...`node fast-usdc operator attest`.split(' '),
    ...flags({
      previousOfferId: 123,
      forwardingChannel: 'channel-21',
      recipientAddress:
        'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek?EUD=dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      blockHash:
        '0x80d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee699',
      blockNumber: 21037669,
      blockTimestamp: 1730762099,
      chainId: 1,
      amount: 300000000,
      forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelktz',
      txHash:
        '0xd81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
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
        invitationArgs: [
          {
            aux: {
              forwardingChannel: 'channel-21',
              recipientAddress:
                'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek?EUD=dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
            },
            blockHash:
              '0x80d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee699',
            blockNumber: 21037669n,
            blockTimestamp: 1730762099n,
            chainId: 1,
            tx: {
              amount: 300000000n,
              forwardingAddress: 'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelktz',
            },
            txHash:
              '0xd81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
          },
        ],
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
