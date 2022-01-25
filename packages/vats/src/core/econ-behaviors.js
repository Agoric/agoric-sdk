// @ts-check

import { E } from '@agoric/far';

import { installOnChain as installVaultFactoryOnChain } from '@agoric/run-protocol/bundles/install-on-chain.js';
import { CENTRAL_ISSUER_NAME } from './utils.js';

/**
 * @param {{
 *   consume: {
 *    agoricNames: ERef<NameHub>,
 *    nameAdmins: ERef<Store<NameHub, NameAdmin>>,
 *    board: ERef<Board>,
 *    chainTimerService: ERef<TimerService>,
 *    loadVat: ERef<VatLoader<PriceAuthorityVat>>,
 *    zoe: ERef<ZoeService>,
 *    feeMintAccess: ERef<FeeMintAccess>,
 *   },
 *   produce: {
 *     priceAuthorityAdmin: Producer<PriceAuthorityRegistryAdmin>
 *   }
 * }} powers
 *
 * @typedef { import('@agoric/zoe/tools/priceAuthorityRegistry').PriceAuthorityRegistryAdmin } PriceAuthorityRegistryAdmin
 * @typedef {ERef<ReturnType<import('../vat-priceAuthority.js').buildRootObject>>} PriceAuthorityVat
 */
export const startVaultFactory = async ({
  consume: {
    agoricNames,
    nameAdmins: nameAdminsP,
    board,
    chainTimerService,
    loadVat,
    zoe,
    feeMintAccess: feeMintAccessP,
  },
  produce: { priceAuthorityAdmin },
}) => {
  // TODO: Zoe should accept a promise, since the value is in that vat.
  const [feeMintAccess, nameAdmins] = await Promise.all([
    feeMintAccessP,
    nameAdminsP,
  ]);

  const { priceAuthority, adminFacet } = await E(
    E(loadVat)('priceAuthority'),
  ).makePriceAuthority();

  priceAuthorityAdmin.resolve(adminFacet);

  return installVaultFactoryOnChain({
    agoricNames,
    board,
    centralName: CENTRAL_ISSUER_NAME,
    chainTimerService,
    nameAdmins,
    priceAuthority,
    zoe,
    bootstrapPaymentValue: 0n, // TODO: this is obsolete, right?
    feeMintAccess,
  });
};
harden(startVaultFactory);
