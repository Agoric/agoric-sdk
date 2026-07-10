import test from 'ava';

import {
  calculateInstrumentBlocks,
  type YdsInstrument,
} from '../src/instrument-status.ts';

const caipChainId = 'eip155:1' as const;

const instrument = (
  id: string,
  liquidityUsd: number,
  totalSupplyUsd: number,
): YdsInstrument => ({
  id: id as YdsInstrument['id'],
  caipChainId,
  liquidityUsd,
  totalSupplyUsd,
});

const missingDataInstrument: YdsInstrument = { id: '@Ethereum', caipChainId };

test('calculateInstrumentBlocks ignores instruments without supply/liquidity data', t => {
  const { noDepositInstruments, noWithdrawInstruments } =
    calculateInstrumentBlocks([missingDataInstrument]);

  t.deepEqual([...noDepositInstruments].sort(), []);
  t.deepEqual([...noWithdrawInstruments].sort(), []);
});

test('calculateInstrumentBlocks blocks deposits if liquidity < $10k or < 10% of total supply', t => {
  const instruments = [
    missingDataInstrument,
    instrument('liquidity < $10k but = 10%', 9999.99, 9999.99 * 10),
    instrument('liquidity = $10k but < 10%', 10_000, 10_000 * 10 + 0.01),
    instrument('liquidity < $10k and < 10%', 9999.99, 9999.99 * 10 + 0.01),
    instrument('liquidity = $10k and = 10%', 10_000, 10_000 * 10),
  ];
  const { noDepositInstruments, noWithdrawInstruments } =
    calculateInstrumentBlocks(instruments);

  t.deepEqual(
    [...noDepositInstruments].sort(),
    [
      'liquidity < $10k but = 10%',
      'liquidity = $10k but < 10%',
      'liquidity < $10k and < 10%',
    ].sort(),
  );
  t.deepEqual([...noWithdrawInstruments].sort(), []);
});

test('calculateInstrumentBlocks blocks withdrawals if liquidity < $1k and < 5% of total supply', t => {
  const instruments = [
    instrument('liquidity < $1k but = 5%', 999.99, 999.99 * 20),
    instrument('liquidity = $1k but < 5%', 1000, 1000 * 20 + 0.01),
    instrument('liquidity < $1k and < 5%', 999.99, 999.99 * 20 + 0.01),
    instrument('liquidity = $1k and = 5%', 1000, 1000 * 20),
  ];
  const { noDepositInstruments, noWithdrawInstruments } =
    calculateInstrumentBlocks(instruments);

  t.deepEqual(
    [...noDepositInstruments].sort(),
    instruments.map(({ id }) => id).sort(),
  );
  t.deepEqual([...noWithdrawInstruments].sort(), ['liquidity < $1k and < 5%']);
});
