/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import bundleSource from '@agoric/bundle-source';

import { makeIssuerKit, MathKind, amountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';
import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import { makeFakeVatAdmin } from '../../../src/contractFacet/fakeVatAdmin';
import { makeZoe } from '../../../src/zoeService/zoe';

import '../../../exported';
import '../../../src/contracts/exported';

/**
 * @typedef {Object} TestContext
 * @property {ZoeService} zoe
 * @property {(t: ExecutionContext) => Promise<OracleKit>} makePingOracle
 * @property {Amount} feeAmount
 * @property {IssuerKit} link
 *
 * @typedef {import('ava').ExecutionContext<TestContext>} ExecutionContext
 */

const contractPath = `${__dirname}/../../../src/contracts/oracle`;

test.before(
  'setup oracle',
  /** @param {ExecutionContext} ot */ async ot => {
    // Outside of tests, we should use the long-lived Zoe on the
    // testnet. In this test, we must create a new Zoe.
    const zoe = makeZoe(makeFakeVatAdmin().admin);

    // Pack the contract.
    const contractBundle = await bundleSource(contractPath);

    const link = makeIssuerKit('$LINK', MathKind.NAT);

    // Install the contract on Zoe, getting an installation. We can
    // use this installation to look up the code we installed. Outside
    // of tests, we can also send the installation to someone
    // else, and they can use it to create a new contract instance
    // using the same code.
    const installation = await E(zoe).install(contractBundle);

    const feeAmount = amountMath.make(1000n, link.brand);
    /**
     * @param {ExecutionContext} _t
     * @returns {Promise<OracleKit>}
     */
    const makePingOracle = async _t => {
      /** @type {OracleHandler} */
      const oracleHandler = Far('OracleHandler', {
        async onQuery(query, fee) {
          let requiredFee;
          if (query.kind === 'Paid') {
            requiredFee = feeAmount;
            assert(
              amountMath.isGTE(fee, requiredFee),
              X`Minimum fee of ${feeAmount} not met; have ${fee}`,
            );
          }
          const reply = { pong: query };
          return harden({ reply, requiredFee });
        },
        async onError(_query, _reason) {
          // do nothing
        },
        async onReply(_query, _reply, _fee) {
          // do nothing
        },
      });

      /** @type {OracleStartFnResult} */
      const startResult = await E(zoe).startInstance(
        installation,
        { Fee: link.issuer },
        { oracleDescription: 'myOracle' },
      );
      const creatorFacet = await E(startResult.creatorFacet).initialize({
        oracleHandler,
      });

      return harden({
        ...startResult,
        creatorFacet,
      });
    };

    ot.context.zoe = zoe;
    ot.context.makePingOracle = makePingOracle;
    ot.context.feeAmount = feeAmount;
    ot.context.link = link;
  },
);

test('single oracle', /** @param {ExecutionContext} t */ async t => {
  const { zoe, link, makePingOracle, feeAmount } = t.context;

  // Get the Zoe invitation issuer from Zoe.
  const invitationIssuer = E(zoe).getInvitationIssuer();

  const { creatorFacet: pingCreator, publicFacet } = await makePingOracle(t);

  const query1 = { kind: 'Free', data: 'foo' };
  const query2 = { kind: 'Paid', data: 'bar' };
  const query3 = { kind: 'Paid', data: 'baz' };
  const query4 = { kind: 'Paid', data: 'bot' };

  const freeReply = E(publicFacet).query({ hello: 'World' });
  const invitation1 = E(publicFacet).makeQueryInvitation(query1);
  const invitation2 = E(publicFacet).makeQueryInvitation(query2);
  const invitation3 = E(publicFacet).makeQueryInvitation(query3);
  const invitation4 = E(publicFacet).makeQueryInvitation(query4);

  // Ensure all the invitations actually are real Zoe invitations.
  t.truthy(await E(invitationIssuer).isLive(invitation1));
  t.truthy(await E(invitationIssuer).isLive(invitation2));
  t.truthy(await E(invitationIssuer).isLive(invitation3));
  t.truthy(await E(invitationIssuer).isLive(invitation4));

  t.deepEqual(
    (await E(invitationIssuer).getAmountOf(invitation1)).value[0].query,
    query1,
  );
  t.deepEqual(
    (await E(invitationIssuer).getAmountOf(invitation2)).value[0].query,
    query2,
  );
  t.deepEqual(
    (await E(invitationIssuer).getAmountOf(invitation3)).value[0].query,
    query3,
  );
  t.deepEqual(
    (await E(invitationIssuer).getAmountOf(invitation4)).value[0].query,
    query4,
  );

  const offer = E(zoe).offer(invitation1);

  // Ensure our oracle handles $LINK.
  const overAmount = amountMath.add(
    feeAmount,
    amountMath.make(799n, link.brand),
  );
  const offer3 = E(zoe).offer(
    invitation3,
    harden({ give: { Fee: overAmount } }),
    harden({
      Fee: link.mint.mintPayment(overAmount),
    }),
  );

  t.deepEqual(await freeReply, {
    pong: { hello: 'World' },
  });

  // Check the free result.
  t.deepEqual(await E(offer).getOfferResult(), {
    pong: { kind: 'Free', data: 'foo' },
  });

  // Check the overpaid result.
  t.deepEqual(await E(offer3).getOfferResult(), {
    pong: { kind: 'Paid', data: 'baz' },
  });
  t.deepEqual(
    await link.issuer.getAmountOf(E(offer3).getPayout('Fee')),
    amountMath.subtract(overAmount, feeAmount),
  );

  // Check the unpaid result.
  const offer2 = E(zoe).offer(invitation2);

  // Check the underpaid result.
  const underAmount = amountMath.make(500n, link.brand);
  const offer4 = E(zoe).offer(
    invitation4,
    harden({ give: { Fee: underAmount } }),
    harden({
      Fee: link.mint.mintPayment(underAmount),
    }),
  );

  await t.throwsAsync(() => E(offer2).getOfferResult(), { instanceOf: Error });
  await t.throwsAsync(() => E(offer4).getOfferResult(), { instanceOf: Error });
  t.deepEqual(
    await link.issuer.getAmountOf(E(offer4).getPayout('Fee')),
    underAmount,
  );

  const withdrawSome = E(pingCreator).makeWithdrawInvitation();
  const withdrawOffer = E(zoe).offer(
    withdrawSome,
    harden({
      want: { Fee: amountMath.make(201n, link.brand) },
    }),
  );
  t.is(await E(withdrawOffer).getOfferResult(), 'Successfully withdrawn');

  const shutdownInvitation = E(pingCreator).makeShutdownInvitation();
  const shutdownSeat = E(zoe).offer(shutdownInvitation);

  await E(shutdownSeat)
    .getPayouts()
    .then(payouts =>
      Promise.all(
        Object.entries(payouts).map(async ([keyword, payment]) => {
          const amount = await link.issuer.getAmountOf(payment);
          return [keyword, amount];
        }),
      ),
    )
    .then(kvals => {
      t.deepEqual(kvals, [['Fee', amountMath.make(799n, link.brand)]]);
    });

  const badInvitation = E(publicFacet).makeQueryInvitation({
    hello: 'nomore',
  });
  const badOffer = E(zoe).offer(badInvitation);

  // Ensure the oracle no longer functions after revocation.
  await t.throwsAsync(() => E(badOffer).getOfferResult(), {
    instanceOf: Error,
    message: `No further offers are accepted`,
  });

  await t.throwsAsync(() => E(publicFacet).query({ hello: 'not again' }), {
    instanceOf: Error,
    message: `Oracle revoked`,
  });

  t.deepEqual(
    await link.issuer.getAmountOf(E(withdrawOffer).getPayout('Fee')),
    amountMath.make(201n, link.brand),
  );
});
