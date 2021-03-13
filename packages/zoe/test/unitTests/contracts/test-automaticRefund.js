/* global __dirname */
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';

import { assert, details as X } from '@agoric/assert';
import { evalContractBundle } from '../../../src/contractFacet/evalContractCode';

import { makeZoe } from '../../../src/zoeService/zoe';

function makeFakeVatAdmin(testContextSetter = undefined, makeRemote = x => x) {
  // FakeVatPowers isn't intended to support testing of vat termination, it is
  // provided to allow unit testing of contracts that call zcf.shutdown()
  let exitMessage;
  let hasExited = false;
  let exitWithFailure;
  const fakeVatPowers = {
    exitVat: completion => {
      exitMessage = completion;
      hasExited = true;
      exitWithFailure = false;
    },
    exitVatWithFailure: reason => {
      exitMessage = reason;
      hasExited = true;
      exitWithFailure = true;
    },
  };

  // This is explicitly intended to be mutable so that
  // test-only state can be provided from contracts
  // to their tests.
  const admin = Far('vatAdmin', {
    createVat: bundle => {
      return harden({
        root: makeRemote(
          E(evalContractBundle(bundle)).buildRootObject(
            fakeVatPowers,
            undefined,
            testContextSetter,
          ),
        ),
        adminNode: Far('adminNode', {
          done: () => {
            const kit = makePromiseKit();
            // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
            // This does not suppress any error messages.
            kit.promise.catch(_ => {});
            return kit.promise;
          },
          terminateWithFailure: () => {},
          adminData: () => {},
        }),
      });
    },
    createVatByName: _name => {
      assert.fail(X`createVatByName not supported in fake mode`);
    },
  });
  const vatAdminState = {
    getExitMessage: () => exitMessage,
    getHasExited: () => hasExited,
    getExitWithFailure: () => exitWithFailure,
  };
  return { admin, vatAdminState };
}

const fakeVatAdmin = makeFakeVatAdmin().admin;

const automaticRefundRoot = `${__dirname}/../../../src/contracts/automaticRefund`;

test('multiple instances of automaticRefund for the same Zoe', async t => {
  t.plan(4);
  // Setup zoe
  const zoe = makeZoe(fakeVatAdmin);

  // Alice creates 2 automatic refund instances
  // Pack the contract.
  const bundle = await bundleSource(automaticRefundRoot);

  const installation = await E(zoe).install(bundle);

  const {
    creatorInvitation: aliceInvitation1,
    publicFacet: publicFacet1,
  } = await E(zoe).startInstance(installation);

  const {
    creatorInvitation: aliceInvitation2,
    publicFacet: publicFacet2,
  } = await E(zoe).startInstance(installation);

  const seat1 = await E(zoe).offer(aliceInvitation1);

  const seat2 = await E(zoe).offer(aliceInvitation2);

  const offerResult1 = await E(seat1).getOfferResult();
  const offerResult2 = await E(seat2).getOfferResult();

  t.is(offerResult1, 'The offer was accepted');
  t.is(offerResult2, 'The offer was accepted');

  // Ensure that the number of offers received by each instance is one
  t.is(await E(publicFacet1).getOffersCount(), 1n);
  t.is(await E(publicFacet2).getOffersCount(), 1n);
});
