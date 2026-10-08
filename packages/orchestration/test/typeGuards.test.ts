import '@endo/init/debug.js';

import { M, matches, mustMatch } from '@endo/patterns';
import test from 'ava';
import {
  ChainAddressShape,
  CosmosChainAddressShape,
  SignedEIP712DataShape,
} from '../src/typeGuards.js';

test('CosmosChainAddress', t => {
  mustMatch(
    harden({
      chainId: 'noble-1',
      encoding: 'bech32',
      value: 'noble1test',
    }),
    CosmosChainAddressShape,
  );

  t.throws(() =>
    mustMatch(
      harden({
        chainId: 'noble-1',
        encoding: 'bech32',
        value: 'noble1test',
        extraField: 'extraValue',
      }),
      CosmosChainAddressShape,
    ),
  );

  mustMatch(
    harden({
      chainId: 'noble-1',
      // ignored
      encoding: 'invalid',
      value: 'noble1test',
    }),
    CosmosChainAddressShape,
  );
});

test('backwards compatibility', t => {
  // old name
  t.is(ChainAddressShape, CosmosChainAddressShape);

  // with 'encoding'
  mustMatch(
    harden({
      chainId: 'noble-1',
      encoding: 'bech32',
      value: 'noble1test',
    }),
    CosmosChainAddressShape,
  );
});

test('SignedEIP712Data', t => {
  const signed = harden({
    domain: { name: 'Test', version: '1' },
    types: { Test: [{ name: 'value', type: 'uint256' }] },
    primaryType: 'Test',
    message: { value: 1n },
    signature: `0x${'ab'.repeat(65)}`,
  });
  mustMatch(signed, SignedEIP712DataShape);
  mustMatch(
    harden({ ...signed, signature: { r: '0x01', s: '0x02', v: 27n } }),
    SignedEIP712DataShape,
  );
  t.false(matches(harden({ ...signed, signature: 1 }), SignedEIP712DataShape));

  const { signature: _, ...unsigned } = signed;
  t.false(matches(harden(unsigned), SignedEIP712DataShape));
  t.false(matches(harden({ ...signed, extra: 1 }), SignedEIP712DataShape));

  const extended = M.splitRecord(SignedEIP712DataShape, { extra: M.number() });
  t.true(matches(harden({ ...signed, extra: 1 }), extended));
});
