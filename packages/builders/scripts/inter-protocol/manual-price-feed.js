import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';

import process from 'process';

/**
 * After extracting the oracleAdmins to entries in home.scratch, you can use one
 * from the REPL like:
 *
 *     lookup('agoricNames', 'oracleBrand', 'ATOM').then(brand => atom = brand)
 *     -> [Object Alleged: ATOM brand]{}
 *     lookup('agoricNames', 'oracleBrand', 'USD').then(brand => usd = brand)
 *     -> [Object Alleged: USD brand]{}
 *     pa = home.priceAuthority
 *      -> [Object Alleged: PriceAuthority]{}
 *     qn = E(pa).makeQuoteNotifier({ value: 1n * 10n ** 6n, brand: atom }, usd)
 *     -> [Object Alleged: QuoteNotifier]{}
 *     oa = E(home.scratch).get("offerResult unknown#1652669688625")
 *     -> [Object Alleged: OracleAdmin]{}
 *     E(oa).pushResult('19.37')
 *     E(qn).getUpdateSince()
 *
 * @typedef {{
 *   board: import('@agoric/vats').Board;
 *   chainTimerService;
 *   scratch;
 *   zoe;
 * }} Home
 * @param {Promise<Home>} homePromise
 * @param {object} root0
 * @param {(...path: string[]) => Promise<any>} root0.lookup A promise for the
 *   references available from REPL home
 */
export default async function priceAuthorityFromNotifier(
  homePromise,
  { lookup },
) {
  const { AGGREGATOR_INSTANCE_LOOKUP } = process.env;

  // Let's wait for the promise to resolve.
  const home = await deeplyFulfilled(homePromise);

  let aggregatorInstance;
  if (AGGREGATOR_INSTANCE_LOOKUP) {
    aggregatorInstance = await lookup(JSON.parse(AGGREGATOR_INSTANCE_LOOKUP));
  }

  if (!aggregatorInstance) {
    console.log('Autodetecting aggregator instance...');
    // @ts-expect-error inspecific Home type
    const purse = E(home.wallet).getPurse('Default Zoe invite purse');
    const { value } = await E(purse).getCurrentAmount();
    const invitations = value.filter(
      ({ description }) => description === 'oracle invitation',
    );
    if (invitations.length > 1) {
      console.error('Multiple oracle invitations found', invitations);
      throw Error('You need an AGGREGATOR_INSTANCE_LOOKUP to disambiguate');
    }
    if (invitations.length === 0) {
      console.error(
        'No oracle invitations found; you may need an AGGREGATOR_INSTANCE_LOOKUP',
      );
    } else {
      console.log('Found oracle invitation', invitations);
      aggregatorInstance = invitations[0].instance;
    }
  }

  if (!aggregatorInstance) {
    return;
  }

  const offer = {
    id: Date.now(),
    proposalTemplate: {},
    invitationQuery: {
      description: 'oracle invitation',
      instance: aggregatorInstance,
    },
  };

  console.log('Getting wallet bridge...');
  // @ts-expect-error inspecific Home type
  const bridge = await E(home.wallet).getBridge();

  // Consume an aggregator invitation for this instance.
  await E(bridge)
    .addOffer(offer)
    .then(
      () =>
        console.log(
          `Please approve your wallet's proposal to connect the aggregator ${aggregatorInstance}...`,
        ),
      () => {},
    );

  // @ts-expect-error inspecific Home type
  const walletAdmin = E(home.wallet).getAdminFacet();

  console.log('=====================================================');
  console.log('=== Extracting oracleAdmins from price feed offers...');
  console.log('=== Control-C to cancel');
  const offerIt = E(walletAdmin).getOffersNotifier();
  for await (const offers of makeNotifierFromAsyncIterable(offerIt)) {
    // console.log(offers);
    const completed = offers
      .filter(
        ({ status, invitationQuery: { instance } }) =>
          status === 'complete' && instance === aggregatorInstance,
      )
      .map(async ({ id }) => {
        const orKey = `offerResult ${id}`;
        await E(home.scratch).set(
          orKey,
          // @ts-expect-error inspecific Home type
          E(home.wallet).lookup('offerResult', id),
        );
        console.log(
          'Use this oracleAdmin:',
          `E(home.scratch).get(${JSON.stringify(orKey)})`,
        );
      });
    await Promise.all(completed);
  }
}
