// @ts-check

import { Far } from '@agoric/marshal';
import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

const start = async (escrowService, terms, privateArgs) => {
  const issuerKit = makeIssuerKit('tokens', AssetKind.NAT);
  await E(escrowService).addIssuer(issuerKit.issuer);
  const { payoutHandler } = privateArgs;

  const buyTokens = async buyerAccount => {
    const [buyerSnapshot] = await E(escrowService).startTransfer([
      buyerAccount,
    ]);
    const {
      currentAmounts: buyerContributed,
      seat: buyerSeat,
      conditions: { wantedAmounts: buyerWanted },
    } = buyerSnapshot;

    // TODO: check that there is enough money to cover the wanted
    // tokens, using the wantedAmounts and currentAmounts. Also, leave
    // any excess contributed.

    const payment = issuerKit.mint.mintPayment(buyerWanted);
    const conditions = harden({ wantedAmounts: buyerContributed });
    const sellerAccount = E(escrowService).openEscrowAccount(
      payment,
      conditions,
      payoutHandler,
    );
    await E(escrowService).completeTransfer([
      {
        seat: buyerSeat,
        add: buyerWanted,
        subtract: buyerContributed,
      },
      {
        account: sellerAccount,
        add: buyerContributed,
        subtract: buyerWanted,
      },
    ]);
  };

  return Far('API', { buyTokens, getIssuer: issuerKit.issuer });

  // or return an object that allows the holder to create new use obj
  // <-> invitations if we want the sale to be private
};

harden(start);
export { start };
