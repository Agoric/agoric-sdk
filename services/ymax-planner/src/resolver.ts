import { type SigningSmartWalletKit } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.js';
import type { StdFee } from '@cosmjs/stargate';
import type { SmartWalletKitWithSequence } from './main.js';

type ResolveTxParams = {
  signingSmartWalletKit: SmartWalletKitWithSequence;
  txId: TxId;
  status: Omit<TxStatus, 'pending'>;
  proposal?: object;
};

const smartWalletFee: StdFee = {
  // As of 2025-11, a resolver transaction consumes 125_000 to 160_000 gas
  // units, so 400_000 includes a fudge factor of over 2x.
  gas: '400000',
  // As of 2025-11, validators seem to still be using the Agoric
  // `minimum-gas-prices` recommendation of 0.01ubld per gas unit:
  // https://community.agoric.com/t/network-change-instituting-fees-on-the-agoric-chain-to-mitigate-spam-transactions/109/2
  // So 10_000 ubld = 0.01 BLD includes a fudge factor of over 2x.
  amount: [{ denom: 'ubld', amount: '10000' }],
};

const getInvitationMakers = async (wallet: SmartWalletKitWithSequence) => {
  const getCurrentWalletRecord = await wallet.query.getCurrentWalletRecord();
  const invitation = getCurrentWalletRecord.offerToUsedInvitation
    .filter(inv => inv[1].value[0].description === 'resolver')
    .toSorted()
    .at(-1);
  if (!invitation) {
    throw new Error('No invitation makers found');
  }
  return {
    id: invitation[0],
    invitation: invitation[1],
  };
};

export const resolvePendingTx = async ({
  signingSmartWalletKit,
  txId,
  status,
  proposal = {},
}: ResolveTxParams) => {
  const invitationMakersOffer = await getInvitationMakers(
    signingSmartWalletKit,
  );

  const action: OfferSpec = harden({
    id: `offer-${Date.now()}`,
    invitationSpec: {
      source: 'continuing',
      previousOffer: invitationMakersOffer.id,
      invitationMakerName: 'SettleTransaction',
    },
    offerArgs: {
      status,
      txId,
    },
    proposal,
  });

  const result = await signingSmartWalletKit.executeOffer(action);
  return result;
};
