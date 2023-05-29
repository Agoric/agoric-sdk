// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { heapZone } from '../heap.js';

import { makeMint } from './makeMint.js';
import { prepareIssuerKit } from './makeMintExo.js';

const qualifyImplementation = (label, maker) => {
  test(`makeMint: ${label}`, t => {
    const mint = maker();
    const p1 = mint.makePurse(10n);
    const p2 = mint.makePurse(0n);
    p2.deposit(3n, p1.withdraw(3n));
    t.is(p1.getBalance(), 7n);
    t.is(p2.getBalance(), 3n);
  });
};

qualifyImplementation('objects-as-closures', makeMint);

// implements the same API
const makeIssuerKit = prepareIssuerKit(heapZone);
qualifyImplementation('exo', () => makeIssuerKit().mint);
