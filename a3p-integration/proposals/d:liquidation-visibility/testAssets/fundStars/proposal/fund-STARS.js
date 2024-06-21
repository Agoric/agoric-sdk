import { AmountMath } from "@agoric/ertp";
import { reserveThenDeposit } from "@agoric/inter-protocol/src/proposals/utils.js"
import { E } from "@endo/far";

const log = (...args) => {
  console.log('FUND STARS', args);
}

export const init = async (
  {
    consume: {
      contractKits: contractKitsP,
      agoricNames,
      namesByAddressAdmin,
    }
  },
  { options: { fundAccounts } },
) => {
  log('Start core eval');
  log('Waiting for powers..');
  const [contractKits, starsIssuer] = await Promise.all([
    contractKitsP,
    E(agoricNames).lookup('issuer', 'STARS'),
  ])
  log('Powers: ', starsIssuer, contractKits);

  log('Finding stars kit...');
  const [starsKit] = [...contractKits.values()].filter(value => {
    log('VALUE', value);
    return value.publicFacet === starsIssuer;
  });

  log('Found stars kit:', starsKit);

  const { creatorFacet: mint, publicFacet: issuer } =
    starsKit;

  const starsBrand = await E(issuer).getBrand();
  log('Stars Brand: ', starsBrand);

  const fundAcct = async addr => {
    // Fund addr with 1_000_000n STARS
    const starsAmount = AmountMath.make(
      starsBrand,
      1_000_000_000_000_000_000_000n,
    );
    log('STARS Amount: ', starsAmount);

    const starsPayment = await E(mint).mintPayment(starsAmount);
    log('STARS Payment: ', starsPayment);
    await reserveThenDeposit(
      `Fund ${addr}`,
      namesByAddressAdmin,
      addr,
      [starsPayment],
    );
  };

  log('Depositing payments...');
  await Promise.all([...fundAccounts].map(fundAcct));
  log('Payments deposited.')
};

export const getFundStarsManifest = async (_powers, { fundAccounts }) =>
  harden({
    manifest: {
      [init.name]: {
        consume: {
          contractKits: true,
          agoricNames: true,
          namesByAddressAdmin: true,
        }
      },
    },
    options: {
      fundAccounts,
    },
  });