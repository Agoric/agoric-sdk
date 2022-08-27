import { assert, details as X, q } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';

export const makeId = (dappOrigin, rawId) => `${dappOrigin}#${rawId}`;

const assertFirstCapASCII = str => {
  assert.typeof(str, 'string');
  const firstCapASCII = /^[A-Z][a-zA-Z0-9_$]*$/;
  assert(
    firstCapASCII.test(str),
    X`The string ${q(
      str,
    )} must be an ascii identifier starting with upper case.`,
  );
  assert(
    str !== 'NaN' && str !== 'Infinity',
    X`keyword ${q(str)} must not be a number's name`,
  );
};

/**
 * @param {Amount} invitationPurseBalance
 * @param {object} query
 * @param {Board} query.board
 * @param {string} query.boardId
 * @returns {Array}
 * @deprecated
 */
const findByBoardId = async (invitationPurseBalance, { board, boardId }) => {
  assert.typeof(boardId, 'string');
  const invitationHandle = await E(board).getValue(boardId);
  const match = element => element.handle === invitationHandle;
  const matchingValue = invitationPurseBalance.value.find(match);
  assert(
    matchingValue,
    X`Cannot find invitation corresponding to ${q(boardId)}`,
  );

  return harden([matchingValue]);
};

// An invitation matching the query parameters is already expected
// to be deposited in the default Zoe invitation purse
/**
 * @param {Amount} invitationPurseBalance
 * @param {Record<string, any>} kvs
 */
const findByKeyValuePairs = async (invitationPurseBalance, kvs) => {
  // For every key and value in `query`, return an amount
  // with any matches for those exact keys and values. Keys not in
  // `query` count as a match
  const matches = invitationDetail =>
    Object.entries(kvs).every(
      ([key, value]) => invitationDetail[key] === value,
    );

  const matchingValue = invitationPurseBalance.value.find(matches);
  assert(matchingValue, X`Cannot find invitation corresponding to ${q(kvs)}`);
  return harden([matchingValue]);
};

/**
 *
 * @param {ERef<Purse>} invitationPurse
 * @param {Brand} invitationBrand
 * @returns {Invitation}
 */
const makeFindInvitation = (invitationPurse, invitationBrand) => {
  const findInvitation = async (queryFn, queryParams) => {
    const purseBalance = await E(invitationPurse).getCurrentAmount();
    const value = await queryFn(purseBalance, queryParams);
    const invitationAmount = AmountMath.make(invitationBrand, value);
    const invitationP = E(invitationPurse).withdraw(invitationAmount);
    return invitationP;
  };
  return findInvitation;
};

/**
 *
 * @param {LegacyMap<string, PromiseRecord<unknown>>} idToOfferResultPromiseKit
 * @param {string} dappOrigin
 * @param {{ description: string, priorOfferId: string }} opts
 * @returns {Promise<Invitation>}
 */
const makeContinuingInvitation = async (
  idToOfferResultPromiseKit,
  dappOrigin,
  { priorOfferId: rawPriorOfferId, description },
) => {
  assertFirstCapASCII(description);

  const priorOfferId = makeId(dappOrigin, rawPriorOfferId);
  const offerResult = await idToOfferResultPromiseKit.get(priorOfferId).promise;
  assert(
    passStyleOf(offerResult) === 'copyRecord',
    `offerResult must be a record to have an invitationMakers property`,
  );
  assert(
    offerResult.invitationMakers,
    `offerResult does not have an invitationMakers property`,
  );

  const invitationP = E(offerResult.invitationMakers)[description]();
  return invitationP;
};

/** @typedef {{method: string, args: Array<any> }} InvitationMaker */
/**
 * @param {InvitationMaker} invitationMaker
 * @param {string} instanceHandleBoardId
 * @param {Board} board
 * @param {ZoeService} zoe
 * @returns {Promise<Invitation>}
 */
const makeInvitation = async (
  invitationMaker,
  instanceHandleBoardId,
  board,
  zoe,
) => {
  const instance = E(board).getValue(instanceHandleBoardId);
  const publicFacet = E(zoe).getPublicFacet(instance);
  const { method, args = [] } = invitationMaker;

  return E(publicFacet)[method](...args);
};

/**
 *
 * @param {LegacyMap<string, PromiseRecord<unknown>>} idToOfferResultPromiseKit
 * @param {ERef<Board>} board
 * @param {ERef<ZoeService>} zoe
 * @param {Purse} invitationPurse
 * @param {Brand} invitationBrand
 * @param {unknown} offer
 * @returns {Invitation}
 */
export const findOrMakeInvitation = async (
  idToOfferResultPromiseKit,
  board,
  zoe,
  invitationPurse,
  invitationBrand,
  offer,
) => {
  if (offer.invitation) {
    // The invitation is directly specified.
    return offer.invitation;
  }

  const findInvitation = makeFindInvitation(invitationPurse, invitationBrand);

  // Deprecated
  if (offer.inviteHandleBoardId) {
    const queryParams = {
      board,
      boardId: offer.inviteHandleBoardId,
    };
    return findInvitation(findByBoardId, queryParams);
  }

  // Deprecated
  if (offer.invitationHandleBoardId) {
    const queryParams = {
      board,
      boardId: offer.invitationHandleBoardId,
    };
    return findInvitation(findByBoardId, queryParams);
  }

  if (offer.invitationMaker) {
    return makeInvitation(
      offer.invitationMaker,
      offer.instanceHandleBoardId,
      board,
      zoe,
    );
  }

  if (offer.invitationQuery) {
    return findInvitation(findByKeyValuePairs, offer.invitationQuery);
  }

  if (offer.continuingInvitation) {
    const dappOrigin =
      offer.requestContext && offer.requestContext.dappOrigin
        ? offer.requestContext.dappOrigin
        : `unknown`;
    return makeContinuingInvitation(
      idToOfferResultPromiseKit,
      dappOrigin,
      offer.continuingInvitation,
    );
  }

  assert.fail(X`no invitation was found or made for this offer ${offer.id}`);
};
