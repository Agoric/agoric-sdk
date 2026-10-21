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
    domain: {
      name: 'Test',
      version: '1',
      chainId: 1n,
      verifyingContract: `0x${'12'.repeat(20)}`,
    },
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Test: [{ name: 'value', type: 'uint256' }],
    },
    primaryType: 'Test',
    message: { value: 1n },
    signature: `0x${'ab'.repeat(65)}`,
  });
  mustMatch(signed, SignedEIP712DataShape);
  const accepts = (variant: object) =>
    matches(harden({ ...signed, ...variant }), SignedEIP712DataShape);

  t.true(accepts({ signature: { r: '0x01', s: '0x02', v: 27n } }));
  t.false(accepts({ signature: 1 }));

  t.true(accepts({ domain: {} }), 'no domain field is required');
  for (const chainId of ['1', '0x1', 1]) {
    t.true(accepts({ domain: { ...signed.domain, chainId } }), `${chainId}`);
  }
  t.true(
    accepts({ domain: { ...signed.domain, salt: `0x${'00'.repeat(32)}` } }),
  );
  t.false(accepts({ domain: { ...signed.domain, extra: 'x' } }));

  t.true(
    accepts({ types: { Test: signed.types.Test } }),
    'EIP712Domain types are not required',
  );
  t.false(
    accepts({
      types: { Test: [{ name: 'value', type: 'uint256', optional: true }] },
    }),
    'no optional marker',
  );
  t.false(accepts({ types: { Test: [{ name: 'value' }] } }));
  t.false(accepts({ types: { Test: { name: 'value', type: 'uint256' } } }));
  t.false(accepts({ message: 'value' }));

  const { signature: _, ...unsigned } = signed;
  t.false(matches(harden(unsigned), SignedEIP712DataShape));
  t.false(accepts({ extra: 1 }));

  const extended = M.splitRecord(SignedEIP712DataShape, { extra: M.number() });
  t.true(matches(harden({ ...signed, extra: 1 }), extended));

  const requiringDomainTypes = M.splitRecord({
    ...SignedEIP712DataShape,
    types: M.and(
      M.splitRecord({ EIP712Domain: M.any() }, {}, M.any()),
      SignedEIP712DataShape.types,
    ),
  });
  t.true(matches(signed, requiringDomainTypes));
  t.false(
    matches(
      harden({ ...signed, types: { Test: signed.types.Test } }),
      requiringDomainTypes,
    ),
  );
});
