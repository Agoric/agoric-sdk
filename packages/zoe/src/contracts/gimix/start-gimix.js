/**
 * @file core eval script* to start the GIMiX contract.
 *
 * * to turn this module into a script:
 *   - remove `import` declarations entirely
 *   - remove `export` keyword from declarations
 *
 * The `permit` export specifies the corresponding permit.
 */
// @ts-check

import { E, Far } from '@endo/far';

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

/**
 * Smallcaps marshalling for plain data (no caps/slots).
 * Re-implemented to avoid linking @endo/marshal in
 * in a core-eval script.
 *
 * Note unit test in test-gimix.js to confirm correctness.
 *
 * @param {*} data - PlainData
 */
const marshalPlainData = data =>
  JSON.stringify({
    body: `#${JSON.stringify(data)}`,
    slots: [],
  });

export const oracleBrandAux = {
  allegedName: 'GimixOracle',
  /** @type {DisplayInfo} */
  displayInfo: { assetKind: 'copyBag' },
};

export const oracleBrandAuxValue = marshalPlainData(oracleBrandAux);

const trace = (...args) => console.log('start-gimix', ...args);

const fail = msg => {
  throw Error(msg);
};

/**
 * Make a storage node for auxilliary data for a value on the board.
 *
 * @param {ERef<StorageNode>} chainStorage
 * @param {string} boardId
 */
const makeBoardAuxNode = async (chainStorage, boardId) => {
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  return E(boardAux).makeChildNode(boardId);
};

/**
 * @param {BootstrapPowers} powers
 * @param {{ options?: { GiMiX: {
 *   bundleID: string;
 *   oracleAddress: string;
 * }}}} config
 */
export const startGiMiX = async (powers, config = {}) => {
  const {
    consume: { agoricNames, board, chainTimerService, chainStorage, zoe },
    instance: {
      // @ts-expect-error going beyond WellKnownName
      consume: { postalSvc },
      // @ts-expect-error going beyond WellKnownName
      produce: { GiMiX: produceInstance },
    },
    issuer: {
      // @ts-expect-error going beyond WellKnownName
      produce: { GimixOracle: produceIssuer },
    },
    brand: {
      // @ts-expect-error going beyond WellKnownName
      produce: { GimixOracle: produceBrand },
    },
  } = powers;
  const {
    bundleID = fail('no bundleID; try test-gimix-proposal.js?'),
    oracleAddress = fail('no oracleAddress; try test-gimix-proposal.js?'),
  } = config.options?.GiMiX ?? {};

  const timerId = await E(board).getId(await chainTimerService);
  trace('timer', timerId);

  /** @type {Installation<import('./gimix').prepare>} */
  const installation = await E(zoe).installBundleID(bundleID);

  /** @type {import('../../zoeService/utils').StartResult<import('./postalSvc').start>['publicFacet']} */
  const postHub = await E(zoe).getPublicFacet(postalSvc);

  const { creatorFacet, instance: gimixInstance } = await E(zoe).startInstance(
    installation,
    { Stable: await E(agoricNames).lookup('issuer', 'IST') },
    { postalService: await postalSvc },
  );
  const { brands, issuers } = await E(zoe).getTerms(gimixInstance);

  const oracleInvitation = await E(creatorFacet).makeOracleInvitation();
  await E(postHub).sendTo(oracleAddress, oracleInvitation);

  produceInstance.resolve(gimixInstance);
  produceIssuer.resolve(issuers.GimixOracle);
  produceBrand.resolve(brands.GimixOracle);

  /** @type {ERef<StorageNode>} */
  // @ts-expect-error only null in testing
  const storage = chainStorage;
  const boardId = await E(board).getId(brands.GimixOracle);
  const node = await makeBoardAuxNode(storage, boardId);
  await E(node).setValue(oracleBrandAuxValue);

  trace('gimix started!');
};

export const manifest = /** @type {const} */ ({
  [startGiMiX.name]: {
    consume: {
      agoricNames: true,
      board: true,
      chainTimerService: true,
      chainStorage: true,
      zoe: true,
    },
    instance: {
      produce: { GiMiX: true },
    },
    issuer: {
      produce: { GimixOracle: true },
    },
    brand: {
      produce: { GimixOracle: true },
    },
  },
});

export const permit = JSON.stringify(Object.values(manifest)[0]);

// script completion value
startGiMiX;
