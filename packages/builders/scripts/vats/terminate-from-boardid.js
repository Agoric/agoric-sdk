// @ts-nocheck
/* global E */
// import { E } from '@endo/far'; // TODO: remove

const terminateFromBoardId = async powers => {
  //   const boardID = 'board04149'; // emerynet or something
  const boardID = 'board03040'; // ATOM-USD_price_feed in bootstrap test
  const instanceHandle = await E(powers.consume.board).getValue(boardID);
  const instanceKit = await E(powers.consume.governedContractKits).get(
    instanceHandle,
  );
  console.log(instanceKit);
  const instanceAdminFacet = await E(
    instanceKit.governorCreatorFacet,
  ).getAdminFacet();
  await E(instanceAdminFacet).terminateContract(
    harden(Error('terminated by core-eval')),
  );
};
harden(terminateFromBoardId);

terminateFromBoardId;
