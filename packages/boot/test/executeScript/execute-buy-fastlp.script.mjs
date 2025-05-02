/* eslint-disable */
/// <reference types="@agoric/smart-wallet/src/wallet-script-env" />

trace('hello from inside the Buy Fast LP script!');

const istBrand = await E(powers.agoricNames).lookup('brand', 'IST');
const usdcBrand = await E(powers.agoricNames).lookup('brand', 'USDC');

const dollarValue = 100_000n; // 10¢

// Swap IST for USDC
await E(powers.offers).executeOffer({
  // TODO how to ensure uniqueness across invocations? maybe the facet prefixes the offerId?
  id: 'get-usdc',
  invitationSpec: {
    source: 'agoricContract',
    instancePath: ['psm-IST-USDC'],
    callPipe: [['makeGiveMintedInvitation']],
  },
  proposal: {
    give: {
      // FIXME the wallet in the test doesn't have any IST
      In: { brand: istBrand, value: dollarValue },
    },
    want: {
      Out: { brand: usdcBrand, value: dollarValue },
    },
  },
});

trace('swapped IST for USDC');

// TODO this requires the test env to have the FU contract started
const lpBrand = await E(powers.agoricNames).lookup('brand', 'FastLP');

// Buy FastLP with USDC
await E(powers.offers).executeOffer({
  // TODO how to ensure uniqueness across invocations? maybe the facet prefixes the offerId?
  id: 'buy-fastlp',
  invitationSpec: {
    source: 'agoricContract',
    instancePath: ['fastUsdc'],
    callPipe: [['makeDepositInvitation']],
  },
  proposal: {
    give: {
      USDC: { brand: usdcBrand, value: dollarValue },
    },
    want: {
      // XXX ignoring the current price
      PoolShare: { brand: lpBrand, value: 1 },
    },
  },
});
