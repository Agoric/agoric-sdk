import { mustMatch } from '@endo/patterns';
import test from 'ava';
import {
  ChainAddressShape,
  CosmosChainAddressShape,
} from '../src/typeGuards.js';

test('CosmosChainAddress', t => {
  mustMatch(
    harden({
      chainId: 'noble-1',
      value: 'noble1test',
    }),
    CosmosChainAddressShape,
  );

  mustMatch(
    harden({
      chainId: 'noble-1',
      value: 'noble1test',
      extraField: 'extraValue',
    }),
    CosmosChainAddressShape,
  );

  t.throws(() => {
    mustMatch(
      harden({
        chainId: 'noble-1',
        encoding: 'bech32boo',
        value: 'noble1test',
      }),
      CosmosChainAddressShape,
    );
  });
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
