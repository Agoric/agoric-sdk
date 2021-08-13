// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import { bindDefaultFeePurse } from '../../src/zoeService/feePurse.js';

const zoe = Far('mockZoe', {
  makeFeePurse: () => Far('feePurse', {}),
  bindDefaultFeePurse: feePurse => bindDefaultFeePurse(zoe, feePurse),
  // @ts-ignore Mocked for tests
  install: (bundle, feePurse) => feePurse,
  startInstance: (
    // @ts-ignore Mocked for tests
    installation,
    // @ts-ignore Mocked for tests
    issuerKeywordRecord,
    // @ts-ignore Mocked for tests
    terms,
    // @ts-ignore Mocked for tests
    privateArgs,
    feePurse,
  ) => feePurse,
  // @ts-ignore Mocked for tests
  offer: (invitation, proposal, paymentKeywordRecord, offerArgs, feePurse) =>
    feePurse,
  // @ts-ignore Mocked for tests
  getPublicFacet: (instance, feePurse) => feePurse,
});

test('bindDefaultFeePurse', async t => {
  const defaultFeePurse = await E(zoe).makeFeePurse();
  const customFeePurse = await E(zoe).makeFeePurse();
  // @ts-ignore Mocked for tests
  const boundZoe = E(zoe).bindDefaultFeePurse(defaultFeePurse);

  // @ts-ignore Mocked for tests
  t.is(await E(boundZoe).install(undefined), defaultFeePurse);
  // @ts-ignore Mocked for tests
  t.is(await E(boundZoe).install(undefined, customFeePurse), customFeePurse);

  t.is(
    // @ts-ignore Mocked for tests
    await E(boundZoe).startInstance(undefined, undefined, undefined, undefined),
    defaultFeePurse,
  );
  t.is(
    await E(boundZoe).startInstance(
      // @ts-ignore Mocked for tests
      undefined,
      undefined,
      undefined,
      undefined,
      customFeePurse,
    ),
    customFeePurse,
  );

  t.is(
    // @ts-ignore Mocked for tests
    await E(boundZoe).offer(undefined, undefined, undefined, undefined),
    defaultFeePurse,
  );
  t.is(
    await E(boundZoe).offer(
      // @ts-ignore Mocked for tests
      undefined,
      undefined,
      undefined,
      undefined,
      customFeePurse,
    ),
    customFeePurse,
  );

  // @ts-ignore Mocked for tests
  t.is(await E(boundZoe).getPublicFacet(undefined), defaultFeePurse);
  t.is(
    // @ts-ignore Mocked for tests
    await E(boundZoe).getPublicFacet(undefined, customFeePurse),
    customFeePurse,
  );
});
