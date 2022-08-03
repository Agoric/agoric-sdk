// @ts-check
import { AmountMath } from '@agoric/ertp';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { E } from '@endo/far';

const { entries } = Object;

const dec6 = 10n ** 6n;
const dec4 = 10n ** 4n;

const config = {
  Central: { IST: 10_000n * dec6 },
  Secondary: { IbcATOM: 500n * dec4 }, // 20 IST per ATOM
};

// /** @type {<K extends string,V>(es: [K,V][]) => Record<K,V>} */
// const recordFromEntries = Object.fromEntries;

const getOfferResult = async (instance, wallet, walletAdmin) => {
  const offerIt = E(walletAdmin).getOffersNotifier();
  let result;
  console.log('awaiting offers...');
  for await (const offers of makeNotifierFromAsyncIterable(offerIt)) {
    console.log('offers iterator:', offers);
    offers
      .filter(
        ({ status, invitationQuery }) =>
          status === 'complete' && invitationQuery.instance === instance,
      )
      .forEach(async ({ id }) => {
        result = await E(wallet).lookup('offerResult', id);
        console.log({ facet: result });
      });
    if (result) break;
  }
  return result;
};

/**
 *
 * @param {import('./user-bundle').HomeBundle} homeP
 * @param { {now?: () => number }} _endowments
 *
 * @typedef {ReturnType<typeof import('../../wallet/api/src/lib-wallet').makeWallet>['admin']} Wallet
 */
const addInitialLiquidity = async (homeP, { now = () => Date.now() }) => {
  const { wallet, agoricNames, zoe, scratch } = E.get(homeP);

  const walletBridge = E(wallet).getBridge();
  //   const iNot = E(wb).getIssuersNotifier();
  //   const { value: iEntries } = await E(iNot).getUpdateSince();
  //   const issuers = recordFromEntries(iEntries);
  //   console.log(issuers);

  const getService = async name => {
    console.log('lookup instance', name);
    const instance = await E(agoricNames).lookup('instance', name);
    const pub = E(zoe).getPublicFacet(instance);
    return { instance, pub };
  };
  const amm = await getService('amm');

  const addUsingWallet = async () => {
    console.log('getting purses from walletBridge...');
    const { value: pStates } = await E(
      E(walletBridge).getPursesNotifier(),
    ).getUpdateSince();
    console.log(pStates);

    const toAmt = detail => {
      const [[name, value]] = entries(detail);
      const { pursePetname } =
        pStates.find(p => p.brandPetname === name) ||
        assert.fail(`cannot find purse ${name}`);
      return { pursePetname, value };
    };
    const proposalTemplate = {
      give: {
        Central: toAmt(config.Central),
        Secondary: toAmt(config.Secondary),
      },
    };
    console.log({ proposalTemplate });

    console.log('amm.makeAddLiquidityInvitation...');
    const invitation = await E(amm.pub).makeAddLiquidityInvitation();
    console.log({ invitation });

    const offerConfig = {
      id: `${now()}`,
      invitation,
      // installationHandle: amm.installation,
      instanceHandle: amm.instance,
      proposalTemplate,
      requestContext: undefined,
    };
    console.log('addOffer', offerConfig);
    const added = await E(walletBridge).addOffer(offerConfig);
    console.log({ added });

    const result = await getOfferResult(
      amm.instance,
      wallet,
      E(wallet).getAdminFacet(),
    );
    console.log({ result });
  };

  const addUsingZoe = async () => {
    const { keys, values } = Object;
    /** @type {<K extends string, V>(entries: [K, V][]) => Record<K, V>} */
    const toRecord = Object.fromEntries;

    console.log('getting purses, issuers from wallet...');
    const [purseEntries, { value: issuerEntries }] = await Promise.all([
      E(wallet).getPurses(),
      E(E(walletBridge).getIssuersNotifier()).getUpdateSince(),
    ]);

    const purses = toRecord(purseEntries);
    const issuers = toRecord(issuerEntries);
    console.log({ purses: keys(purses), issuers: keys(issuers) });
    const liqIssuer = E(amm.pub).getLiquidityIssuer(issuers.IbcATOM.brand);
    const liqBrand = await E(liqIssuer).getBrand();

    /** @param {Record<string, bigint>} detail */
    const toAmt = detail => {
      const [[name, value]] = entries(detail);
      const issuer = issuers[name];
      assert(issuer);
      return AmountMath.make(issuer.brand, value);
    };
    /** @param {Amount} amt */
    const withdraw = async amt => {
      for await (const purse of values(purses)) {
        const b2 = await E(purse).getAllegedBrand();
        if (b2 === amt.brand) {
          return E(purse).withdraw(amt);
        }
      }
      throw Error(`no purse found for ${amt.brand}`);
    };
    const proposal = {
      want: {
        Liquidity: AmountMath.makeEmpty(liqBrand),
      },
      give: {
        Central: toAmt(config.Central),
        Secondary: toAmt(config.Secondary),
      },
    };
    console.log({ proposal });
    console.log('withdraw payments...', proposal.give);
    const payments = {
      Central: await withdraw(proposal.give.Central),
      Secondary: await withdraw(proposal.give.Secondary),
    };
    console.log('payments', payments);
    console.log('amm.makeAddLiquidityInvitation...');
    const invitation = await E(amm.pub).makeAddLiquidityInvitation();
    console.log({ invitation });

    const seat = await E(zoe).offer(invitation, proposal, payments);
    console.log({ seat });

    const result = await E(seat).getOfferResult();
    console.log({ result });

    const payouts = await E(seat).getPayouts();
    console.log('initialLiquidityPayouts', keys(payouts));
    E(scratch).set('initialLiquidityPayouts', payouts);
  };

  console.log(
    addUsingWallet,
    'does not handle want Liquidity so we do not use it',
  );
  await addUsingZoe();
};
harden(addInitialLiquidity);

export default addInitialLiquidity;
