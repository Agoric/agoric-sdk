/** @file illustrates using non-vbank assets */

// deep import to avoid dependency on all of ERTP, vat-data
import { AmountShape } from '@agoric/ertp';
import { AmountMath, AssetKind } from '@agoric/ertp/src/amountMath.js';
import { makeTracer } from '@agoric/internal';
import { M, getCopyBagEntries } from '@agoric/store';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/index.js';
import { E, Far } from '@endo/far';

const { Fail, quote: q } = assert;

const trace = makeTracer('Game', true);

/** @param {Amount<'copyBag'>} amt */
const totalPlaces = amt => {
  /** @type {[unknown, bigint][]} */
  const entries = getCopyBagEntries(amt.value); // XXX getCopyBagEntries returns any???
  const total = entries.reduce((acc, [_place, qty]) => acc + qty, 0n);
  return total;
};

/**
 * @param {ZCF<{joinPrice: Amount}>} zcf
 */
export const start = async zcf => {
  const { joinPrice } = zcf.getTerms();
  const stableIssuer = await E(zcf.getZoeService()).getFeeIssuer();
  zcf.saveIssuer(stableIssuer, 'Price');

  const { zcfSeat: gameSeat } = zcf.makeEmptySeatKit();
  const mint = await zcf.makeZCFMint('Place', AssetKind.COPY_BAG);

  const joinShape = harden({
    give: { Price: AmountShape },
    want: { Places: AmountShape },
    exit: M.any(),
  });

  /** @param {ZCFSeat} playerSeat */
  const joinHook = playerSeat => {
    const { give, want } = playerSeat.getProposal();
    trace('join', 'give', give, 'want', want.Places.value);

    AmountMath.isGTE(give.Price, joinPrice) ||
      Fail`${q(give.Price)} below joinPrice of ${q(joinPrice)}}`;

    totalPlaces(want.Places) <= 3n || Fail`only 3 places allowed when joining`;

    atomicRearrange(
      zcf,
      harden([
        [playerSeat, gameSeat, give],
        [mint.mintGains(want), playerSeat, want],
      ]),
    );
    playerSeat.exit(true);
    return 'welcome to the game';
  };

  const publicFacet = Far('API', {
    makeJoinInvitation: () =>
      zcf.makeInvitation(joinHook, 'join', undefined, joinShape),
  });

  return harden({ publicFacet });
};
harden(start);
