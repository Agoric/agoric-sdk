// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeCopyBagFromElements, matches } from '@endo/patterns';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { DepositProposalShape } from '../src/typeGuards.js';

test('DepositProposalShape', t => {
  const { brand: natBrand } = makeIssuerKit('myToken', AssetKind.NAT);
  const anyNatAmount = AmountMath.make(natBrand, 1n);
  const { brand: copyBagBrand } = makeIssuerKit('myNft', AssetKind.COPY_BAG);
  const anyCopyBagAmount = AmountMath.make(
    copyBagBrand,
    makeCopyBagFromElements([1]),
  );

  t.true(
    matches(
      harden({ give: { ANY_KEYWORD: anyNatAmount }, exit: { waived: null } }),
      DepositProposalShape,
    ),
  );
  t.false(
    matches(
      harden({
        give: { ANY_KEYWORD: anyCopyBagAmount },
        exit: { waived: null },
      }),
      DepositProposalShape,
    ),
    'give entry value must be a Nat amount',
  );
  t.false(
    matches(
      harden({
        give: { ONE: anyNatAmount, TWO: anyNatAmount },
        exit: { waived: null },
      }),
      DepositProposalShape,
    ),
    'only one entry allowed for give',
  );
  t.false(
    matches(
      harden({
        give: { ANY_KEYWORD: anyNatAmount },
        want: { ANY_KEYWORD: anyNatAmount },
        exit: { waived: null },
      }),
      DepositProposalShape,
    ),
    'want must be empty',
  );
  t.false(
    matches(
      harden({ give: { ANY_KEYWORD: anyNatAmount } }),
      DepositProposalShape,
    ),
    'exit waived: null required',
  );
});
